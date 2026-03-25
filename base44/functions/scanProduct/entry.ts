import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import OpenAI from 'npm:openai@4';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { image_url, query, observed_price } = await req.json();

    // ── Step 1: Identify item + extract detailed specs via GPT-4o vision ──
    const identifyMessages = [
      {
        role: 'system',
        content: `You are an expert product identification AI. Given an image or description, identify the product with maximum precision. Extract all technical specs, materials, serial indicators, edition markers. Return ONLY valid JSON.`,
      },
      {
        role: 'user',
        content: image_url
          ? [
              {
                type: 'text',
                text: `Identify this product precisely. Extract every spec and attribute visible. Return JSON:
{
  "title": "full product name",
  "brand": "brand name",
  "model": "model number/name",
  "category": "main category",
  "subcategory": "subcategory",
  "description": "2-3 sentence description",
  "confidence_score": 0-100,
  "condition_guess": "new/like new/good/fair/poor",
  "year": "release year if identifiable",
  "color": "color/colorway",
  "size_or_capacity": "size/storage/capacity",
  "specs": {
    "key specs as key-value pairs"
  },
  "normalized_search_query": "optimized query for price search e.g. 'Nike Air Jordan 1 Retro High OG Chicago 2015'"
}`,
              },
              { type: 'image_url', image_url: { url: image_url, detail: 'high' } },
            ]
          : `Identify this product from the description: "${query}". Return JSON:
{
  "title": "full product name",
  "brand": "brand name",
  "model": "model number/name",
  "category": "main category",
  "subcategory": "subcategory",
  "description": "2-3 sentence description",
  "confidence_score": 0-100,
  "condition_guess": "new",
  "year": "release year if known",
  "color": "",
  "size_or_capacity": "",
  "specs": {},
  "normalized_search_query": "optimized query for price search"
}`,
      },
    ];

    const identifyResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: identifyMessages,
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    });

    const identified = JSON.parse(identifyResponse.choices[0].message.content);
    const searchQuery = identified.normalized_search_query || `${identified.brand} ${identified.model} ${identified.title}`.trim();

    // ── Step 2: Real-time price search via gpt-4o-search-preview ──
    const priceResponse = await openai.chat.completions.create({
      model: 'gpt-4o-search-preview',
      web_search_options: { search_context_size: 'high' },
      messages: [
        {
          role: 'system',
          content: 'You are a shopping price research expert. Search the web for current real prices. Return ONLY valid JSON with actual prices you found.',
        },
        {
          role: 'user',
          content: `Search online right now for the best current prices for: "${searchQuery}"
Category: ${identified.category || 'general consumer product'}
Condition: ${identified.condition_guess || 'new'}

Search Amazon, eBay, Walmart, Best Buy, Target, StockX, GOAT, Facebook Marketplace, Craigslist and other relevant stores.
Find at least 5-8 real listings with actual prices.

Return JSON:
{
  "listings": [
    {
      "source_name": "retailer name",
      "listing_title": "exact listing title",
      "price_amount": 0.00,
      "condition_label": "new/used/refurbished",
      "source_type": "online_retailer/marketplace/auction/resale",
      "product_url": "actual URL if found",
      "availability_label": "in stock/limited/sold out",
      "notes": "any relevant notes"
    }
  ],
  "price_summary": {
    "lowest_price": 0.00,
    "median_price": 0.00,
    "high_price": 0.00,
    "average_price": 0.00,
    "deal_score": 0-100,
    "recommendation_label": "Great Deal/Good Price/Fair Price/Overpriced/Premium Item",
    "market_notes": "brief market insight"
  },
  "value_assessment": {
    "value_verdict": "Common/Resellable/Collectible/Limited Edition/Vintage/Rare/Research More",
    "resale_potential_score": 0-100,
    "collectible_potential_score": 0-100,
    "rarity_signal_score": 0-100,
    "research_recommended": true/false,
    "reasoning": ["reason 1", "reason 2", "reason 3"],
    "cautionary_notes": "any warnings"
  }
}`,
        },
      ],
      max_tokens: 2000,
    });

    let priceData = {};
    try {
      const content = priceResponse.choices[0].message.content;
      // Extract JSON from response (may have markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) priceData = JSON.parse(jsonMatch[0]);
    } catch (e) {
      priceData = { listings: [], price_summary: {}, value_assessment: {} };
    }

    // Adjust deal_score based on observed price
    const ps = priceData.price_summary || {};
    if (observed_price && ps.lowest_price) {
      const obs = parseFloat(observed_price);
      const savings = obs - ps.lowest_price;
      const pct = (savings / obs) * 100;
      if (pct > 30) ps.deal_score = Math.min(100, (ps.deal_score || 50) + 20);
      else if (pct < -10) ps.deal_score = Math.max(0, (ps.deal_score || 50) - 20);
      ps.difference_from_observed = savings;
    }

    return Response.json({
      identified: {
        ...identified,
        specs_json: JSON.stringify(identified.specs || {}),
        attributes_json: JSON.stringify({
          year: identified.year,
          color: identified.color,
          size_or_capacity: identified.size_or_capacity,
          ...(identified.specs || {}),
        }),
      },
      listings: priceData.listings || [],
      price_summary: ps,
      value_assessment: priceData.value_assessment || {},
      search_query_used: searchQuery,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { discovery_id } = body;
    if (!discovery_id) return Response.json({ error: 'Discovery ID required' }, { status: 400 });

    const items = await base44.entities.Discovery.filter({ id: discovery_id });
    if (items.length === 0) return Response.json({ error: 'Discovery not found' }, { status: 404 });
    const discovery = items[0];

    const searchQuery = [
      discovery.title,
      discovery.possible_brand,
      discovery.possible_model,
      discovery.subcategory,
    ].filter(Boolean).join(' ');

    const prompt = `Search online marketplaces (eBay, Amazon, Etsy, Walmart, and other relevant marketplaces) for this item and find current listings with real prices:

Item: ${discovery.title}
Brand: ${discovery.possible_brand || 'unknown'}
Model: ${discovery.possible_model || 'unknown'}
Category: ${discovery.category}

Find actual current listings with prices. For each listing, include the marketplace name, listing title, price, URL, and condition.

Also estimate the fair market value range (low to high) that this item could reasonably be worth if sold today.

Return ONLY a JSON object with this exact structure:
{
  "lowest_price": number (the lowest price found across all listings),
  "average_price": number (average of all found listing prices),
  "currency": "USD",
  "estimated_worth_low": number (low end of fair market value),
  "estimated_worth_high": number (high end of fair market value),
  "listings": [
    {
      "source": "eBay" | "Amazon" | "Etsy" | "Walmart" | "Other",
      "title": "listing title",
      "price": number,
      "url": "listing URL",
      "condition": "new" | "used" | "refurbished" | "unknown"
    }
  ]
}

Only include real listings with actual prices. If no listings are found, return an empty listings array and zero for prices.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          lowest_price: { type: 'number' },
          average_price: { type: 'number' },
          currency: { type: 'string' },
          estimated_worth_low: { type: 'number' },
          estimated_worth_high: { type: 'number' },
          listings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                source: { type: 'string' },
                title: { type: 'string' },
                price: { type: 'number' },
                url: { type: 'string' },
                condition: { type: 'string' },
              },
            },
          },
        },
      },
    });

    const lowest = result.lowest_price || 0;
    const avg = result.average_price || 0;
    const worthLow = result.estimated_worth_low || 0;
    const worthHigh = result.estimated_worth_high || 0;
    const currency = result.currency || 'USD';
    const listings = result.listings || [];

    await base44.entities.Discovery.update(discovery_id, {
      marketplace_lowest_price: lowest,
      marketplace_avg_price: avg,
      marketplace_currency: currency,
      marketplace_listings: JSON.stringify(listings),
      marketplace_worth_low: worthLow,
      marketplace_worth_high: worthHigh,
      marketplace_searched_at: new Date().toISOString(),
    });

    return Response.json({
      marketplace_lowest_price: lowest,
      marketplace_avg_price: avg,
      marketplace_currency: currency,
      marketplace_listings: JSON.stringify(listings),
      marketplace_worth_low: worthLow,
      marketplace_worth_high: worthHigh,
      marketplace_searched_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
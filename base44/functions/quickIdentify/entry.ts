import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import OpenAI from 'npm:openai@4.77.0';
import { secrets } from 'base44:runtime';
import { DISCOVERY_PROMPT } from '../../shared/discoveryPrompt.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { image_url } = body;
    if (!image_url) return Response.json({ error: 'Image URL required' }, { status: 400 });

    const openai = new OpenAI({ apiKey: secrets.get("OPENAI_API_KEY") });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: DISCOVERY_PROMPT },
            { type: "image_url", image_url: { url: image_url } }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500
    });

    const analysis = JSON.parse(response.choices[0].message.content);
    return Response.json({ analysis, image_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
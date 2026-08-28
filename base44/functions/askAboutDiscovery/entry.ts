import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import OpenAI from 'npm:openai@4.77.0';
import { secrets } from 'base44:runtime';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { discovery_id, question, thread_id } = body;
    if (!discovery_id || !question) return Response.json({ error: 'Missing parameters' }, { status: 400 });

    const discoveries = await base44.entities.Discovery.filter({ id: discovery_id });
    if (discoveries.length === 0) return Response.json({ error: 'Discovery not found' }, { status: 404 });
    const discovery = discoveries[0];

    // Get or create AI thread
    let threadId = thread_id || discovery.ai_thread_id;
    if (!threadId) {
      const thread = await base44.entities.AIThread.create({
        discovery_id,
        title: question.substring(0, 50)
      });
      threadId = thread.id;
      await base44.entities.Discovery.update(discovery_id, { ai_thread_id: threadId });
    }

    // Get conversation history
    const messages = await base44.entities.AIMessage.filter({ thread_id: threadId });
    const conversationHistory = messages.map(m => ({ role: m.role, content: m.content }));

    // Save user message
    await base44.entities.AIMessage.create({
      thread_id: threadId,
      role: 'user',
      content: question
    });

    // Build discovery context
    let materials = [], characteristics = [], facts = [];
    try { materials = JSON.parse(discovery.materials || "[]"); } catch {}
    try { characteristics = JSON.parse(discovery.characteristics || "[]"); } catch {}
    try { facts = JSON.parse(discovery.interesting_facts || "[]"); } catch {}

    const discoveryContext = `You are answering questions about a specific object the user discovered through their camera.

OBJECT DETAILS:
- Name: ${discovery.title}
- Category: ${discovery.category}
- Subcategory: ${discovery.subcategory || 'unknown'}
- Description: ${discovery.description || 'N/A'}
- Possible brand: ${discovery.possible_brand || 'unknown'}
- Possible model: ${discovery.possible_model || 'unknown'}
- Materials: ${materials.join(', ') || 'unknown'}
- Characteristics: ${characteristics.join(', ') || 'unknown'}
- Estimated era: ${discovery.estimated_era || 'modern'}
- Interesting facts: ${facts.join('; ') || 'none'}

Answer the user's question about this object. Be helpful, accurate, and concise (under 150 words). If you're not sure about something, say so rather than guessing.`;

    const openai = new OpenAI({ apiKey: secrets.get("OPENAI_API_KEY") });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: 'system', content: discoveryContext },
        ...conversationHistory,
        { role: 'user', content: question }
      ],
      max_tokens: 300
    });

    const answer = response.choices[0].message.content;

    await base44.entities.AIMessage.create({
      thread_id: threadId,
      role: 'assistant',
      content: answer
    });

    return Response.json({ answer, thread_id: threadId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
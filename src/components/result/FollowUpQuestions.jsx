import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Sparkles, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getSuggestedQuestions } from '../scan/ScanCategorySelector';
import DepthReveal from './DepthReveal';

export default function FollowUpQuestions({ item, priceSummary, assessment }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const scrollRef = useRef(null);

  const suggestions = getSuggestedQuestions(item.category?.toLowerCase());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const ask = async (question) => {
    if (!question.trim() || loading) return;
    setMessages(prev => [...prev, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);
    setShowChat(true);

    try {
      const context = `You are an AI assistant helping a user understand a scanned item.
Item context:
- Title: ${item.title || 'Unknown'}
- Brand: ${item.brand || 'N/A'}
- Model: ${item.model || 'N/A'}
- Category: ${item.category || 'N/A'}
- Description: ${item.description || 'N/A'}
- Condition: ${item.condition_guess || 'N/A'}
- Additional attributes: ${item.attributes_json || '{}'}
${priceSummary ? `- Price range: $${priceSummary.lowest_price || 0} - $${priceSummary.high_price || 0}` : ''}
${assessment ? `- Value verdict: ${assessment.value_verdict || 'N/A'}` : ''}

User question: ${question}

Answer concisely and helpfully in 2-4 sentences. If you don't know, say so honestly.`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: context,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
      });
      setMessages(prev => [...prev, { role: 'ai', text: res }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I could not process that right now. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DepthReveal delay={0.85}>
      <div className="px-4 mt-4">
        <div className="glass-card rounded-2xl overflow-hidden">
          {/* Header */}
          <button
            onClick={() => setShowChat(!showChat)}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(263 70% 58% / 0.15)' }}>
                <MessageCircle className="w-4 h-4 text-violet-400" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-heading font-semibold text-foreground">Ask AI About This</h3>
                <p className="text-[11px] text-muted-foreground">Follow-up questions about your scan</p>
              </div>
            </div>
            <motion.div animate={{ rotate: showChat ? 180 : 0 }} className="text-muted-foreground">
              <Sparkles className="w-4 h-4" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showChat && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                {/* Messages */}
                {messages.length > 0 && (
                  <div ref={scrollRef} className="max-h-64 overflow-y-auto px-4 pb-3 space-y-3">
                    {messages.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-cyan-500/15' : 'bg-violet-500/15'}`}>
                          {msg.role === 'user' ? <User className="w-3 h-3 text-cyan-400" /> : <Sparkles className="w-3 h-3 text-violet-400" />}
                        </div>
                        <div className={`flex-1 rounded-xl p-2.5 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-cyan-500/10 text-foreground' : 'bg-muted text-muted-foreground'}`}>
                          {msg.text}
                        </div>
                      </motion.div>
                    ))}
                    {loading && (
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-violet-500/15 flex items-center justify-center">
                          <Sparkles className="w-3 h-3 text-violet-400" />
                        </div>
                        <div className="flex gap-1 items-center px-3 py-2.5 rounded-xl bg-muted">
                          {[0, 1, 2].map(i => (
                            <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                  {/* Suggested questions */}
                  {messages.length === 0 && (
                    <div className="px-4 pb-3">
                      <p className="text-[11px] text-muted-foreground mb-2">Try asking:</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((q) => (
                          <motion.button
                            key={q}
                            onClick={() => ask(q)}
                            className="px-3 py-1.5 rounded-full text-[11px] font-medium"
                            style={{ background: 'hsl(263 70% 58% / 0.1)', border: '1px solid hsl(263 70% 58% / 0.2)', color: '#a78bfa' }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {q}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Input */}
                  <div className="px-4 pb-4 pt-2 flex gap-2 items-end">
                    <input
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && ask(input)}
                      placeholder="Ask anything..."
                      className="flex-1 px-3 py-2.5 rounded-xl text-xs text-foreground outline-none"
                      style={{ background: 'hsl(240 12% 10%)', border: '1px solid hsl(240 10% 18%)' }}
                    />
                    <motion.button
                      onClick={() => ask(input)}
                      disabled={!input.trim() || loading}
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: input.trim() && !loading ? 'linear-gradient(135deg, #00d4ff, #8b5cf6)' : 'hsl(240 12% 13%)',
                      }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Send className="w-4 h-4" style={{ color: input.trim() && !loading ? 'white' : 'hsl(220 10% 40%)' }} />
                    </motion.button>
                  </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick ask chips when collapsed */}
        {!showChat && messages.length === 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {suggestions.slice(0, 3).map((q) => (
              <motion.button
                key={q}
                onClick={() => ask(q)}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium"
                style={{ background: 'hsl(240 12% 10%)', border: '1px solid hsl(240 10% 18%)', color: 'hsl(220 10% 60%)' }}
                whileTap={{ scale: 0.95 }}
              >
                {q}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </DepthReveal>
  );
}
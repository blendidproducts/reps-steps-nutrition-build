import React, { useState, useRef, useEffect } from 'react';
import { MessageSquarePlus, X, Send, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I am your RepsAndSteps AI Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, isLoading]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    
    // Add user message to history immediately
    const updatedMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Build the conversation history to give the LLM context
      let prompt = `You are an AI support assistant for a fitness portal called RepsAndSteps. You are helpful, friendly, and knowledgeable about fitness, workouts, nutrition, and using this app. Please provide a helpful and concise answer.

Here is the conversation history:
`;
      updatedMessages.forEach(msg => {
        prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
      prompt += `Assistant:`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error("Failed to get AI response", error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I am having trouble connecting to my brain right now. Please try again later.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-[80px] right-4 sm:bottom-6 sm:right-6 z-[100] w-[350px] max-w-[calc(100vw-2rem)]"
          >
            <Card className="border-brand-blue/30 shadow-2xl bg-card/95 backdrop-blur-xl overflow-hidden flex flex-col h-[450px] max-h-[70vh]">
              <CardHeader className="bg-brand-blue/10 border-b border-brand-blue/20 py-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="w-5 h-5 text-brand-blue" />
                  Support AI
                </CardTitle>
                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-black/20" onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden relative">
                <div ref={scrollRef} className="h-full p-4 overflow-y-auto flex flex-col gap-4 pb-4">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-primary' : 'bg-brand-blue/20 text-brand-blue'}`}>
                        {msg.role === 'user' ? <User className="w-4 h-4 text-primary-foreground" /> : <Bot className="w-4 h-4" />}
                      </div>
                      <div className={`rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-2 max-w-[85%]">
                      <div className="w-8 h-8 rounded-full bg-brand-blue/20 text-brand-blue flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="rounded-2xl px-4 py-3 text-sm bg-muted flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-bounce" />
                        <div className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="p-3 bg-background/80 backdrop-blur-md border-t">
                <form 
                  className="flex w-full gap-2" 
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                >
                  <Input 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                    placeholder="Ask anything..." 
                    className="flex-1 bg-background/50 border-border/50 focus-visible:ring-brand-blue"
                  />
                  <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="bg-brand-blue hover:bg-brand-blue/90 shrink-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="fixed bottom-[80px] right-4 sm:bottom-6 sm:right-6 z-[100]"
          >
            <Button 
              onClick={() => setIsOpen(true)}
              className="w-20 h-20 rounded-full shadow-xl shadow-brand-blue/30 bg-gradient-to-r from-brand-blue to-blue-600 hover:opacity-90 flex items-center justify-center p-0 ring-4 ring-white/10"
            >
              <Bot className="w-10 h-10 text-white" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
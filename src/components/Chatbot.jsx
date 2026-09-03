import React, { useState, useRef, useEffect } from 'react';
import { MessageSquarePlus, X, Send, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Draggable AI-support button ──────────────────────────────────────────
   Moved off the bottom-right corner (it collided with the AiRTP pill and
   covered the MAIN FEATURE card). Now starts top-right, is draggable,
   snaps to whichever edge is nearest on release, fades when idle so it
   never fully blocks content, and remembers where the user left it.      */
const FAB_SIZE = 80;
const EDGE_PAD = 12;
const TOP_SAFE = 88;     // clear of the app header
const BOTTOM_SAFE = 96;  // clear of the bottom tab bar
const DRAG_THRESHOLD = 8;
const POS_KEY = "rns_chatbot_pos";

function DraggableChatButton({ onOpen, hidden }) {
  const [pos, setPos] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [idle, setIdle] = useState(false);
  const drag = useRef({ active: false, moved: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const idleTimer = useRef(null);

  const clamp = (p) => ({
    x: Math.max(EDGE_PAD, Math.min(window.innerWidth - FAB_SIZE - EDGE_PAD, p.x)),
    y: Math.max(TOP_SAFE, Math.min(window.innerHeight - FAB_SIZE - BOTTOM_SAFE, p.y)),
  });

  const bumpIdle = () => {
    setIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), 2600);
  };

  useEffect(() => {
    let start = null;
    try {
      const saved = JSON.parse(localStorage.getItem(POS_KEY) || "null");
      if (saved && typeof saved.x === "number" && typeof saved.y === "number") start = saved;
    } catch (err) { /* ignore unreadable storage */ }
    if (!start) start = { x: window.innerWidth - FAB_SIZE - EDGE_PAD, y: TOP_SAFE };
    setPos(clamp(start));
    bumpIdle();
    const onResize = () => setPos((p) => (p ? clamp(p) : p));
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(idleTimer.current);
    };
  }, []);

  const onPointerDown = (e) => {
    if (!pos) return;
    drag.current = { active: true, moved: false, sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
    if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    bumpIdle();
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
    d.moved = true;
    setPos(clamp({ x: d.ox + dx, y: d.oy + dy }));
  };

  const endDrag = () => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    setDragging(false);
    if (d.moved) {
      setPos((p) => {
        const snapLeft = p.x + FAB_SIZE / 2 < window.innerWidth / 2;
        const next = clamp({ x: snapLeft ? EDGE_PAD : window.innerWidth - FAB_SIZE - EDGE_PAD, y: p.y });
        try { localStorage.setItem(POS_KEY, JSON.stringify(next)); } catch (err) { /* ignore */ }
        return next;
      });
    } else {
      onOpen();   // it was a tap, not a drag
    }
    bumpIdle();
  };

  if (hidden || !pos) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Open AI support chat"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); }
      }}
      className="fixed z-[100] rounded-full bg-[#0066cc] shadow-xl shadow-brand-blue/30 ring-4 ring-white/10 flex items-center justify-center"
      style={{
        left: pos.x,
        top: pos.y,
        width: FAB_SIZE,
        height: FAB_SIZE,
        touchAction: "none",
        cursor: dragging ? "grabbing" : "grab",
        opacity: dragging ? 1 : idle ? 0.45 : 1,
        transition: dragging ? "none" : "left .18s cubic-bezier(.2,.9,.3,1), opacity .4s ease",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <Bot className="w-10 h-10 text-white pointer-events-none" />
    </div>
  );
}

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

      <DraggableChatButton onOpen={() => setIsOpen(true)} hidden={isOpen} />

    </>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, Mic, MicOff, Bot, User, HelpCircle, AlertCircle } from 'lucide-react';
import { ChatMessage, Task } from '../types';

interface AIChatCompanionProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  tasks: Task[];
  activeTask: Task | null;
  isGenerating: boolean;
}

const CHIPS = [
  { text: "Overwhelmed 😨", prompt: "I am feeling extremely overwhelmed by my task list. Help me find one tiny 5-minute micro-step to start with." },
  { text: "Procrastinating ⏳", prompt: "I am stuck in a procrastination loop. Give me a tough, motivating speech to help me close distractions." },
  { text: "Breakdown help 🛠️", prompt: "Help me break down my most urgent task into tiny, zero-friction steps." },
  { text: "Prioritize ⚡", prompt: "Which of my tasks is the absolute bottleneck right now, and why?" }
];

export default function AIChatCompanion({
  messages,
  onSendMessage,
  tasks,
  activeTask,
  isGenerating
}: AIChatCompanionProps) {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize Web Speech API for voice assistant capability
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => prev ? `${prev} ${transcript}` : transcript);
      };

      rec.onerror = (event: any) => {
        console.error("Speech error:", event.error);
        if (event.error === 'not-allowed') {
          setSpeechError("Microphone access blocked. Click 'Open in New Tab' at the top-right and grant mic permissions!");
        } else if (event.error === 'no-speech') {
          setSpeechError("No speech detected. Please try again.");
        } else {
          setSpeechError(`Voice capture issue: ${event.error}. Try typing!`);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isGenerating) return;

    const textToSend = inputText;
    setInputText('');
    await onSendMessage(textToSend);
  };

  const handleChipClick = async (prompt: string) => {
    if (isGenerating) return;
    await onSendMessage(prompt);
  };

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert("⚠️ Web Speech recognition is not supported in this browser. Please type your query.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div 
      id="ai-chat-companion-card"
      className="bg-white border-4 border-black rounded-[24px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col h-[520px] overflow-hidden text-black font-display"
    >
      {/* Companion Header */}
      <div className="bg-black px-5 py-3.5 border-b-2 border-black flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 bg-[#FFE66D] border-2 border-black rounded-xl flex items-center justify-center text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display font-black text-sm text-white">PriorAI Coach</h3>
            <p className="text-[10px] text-slate-300 flex items-center gap-1 font-mono">
              <span className="h-1.5 w-1.5 bg-[#4ECDC4] rounded-full inline-block animate-pulse" />
              <span>Coaching Core Active</span>
            </p>
          </div>
        </div>

        {activeTask && (
          <span className="text-[10px] bg-[#FFE66D] text-black border-2 border-black px-2 py-0.5 rounded-md truncate max-w-40 font-black font-mono shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
            Focus: {activeTask.title}
          </span>
        )}
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FFFDF6]" id="chat-messages-container">
        {messages.map((msg) => {
          const isAssistant = msg.sender === 'assistant';

          return (
            <div 
              key={msg.id} 
              id={`chat-msg-${msg.id}`}
              className={`flex items-start gap-2.5 ${isAssistant ? '' : 'flex-row-reverse'}`}
            >
              <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 text-xs border-2 border-black ${
                isAssistant 
                  ? 'bg-black text-white' 
                  : 'bg-[#FFE66D] text-black'
              }`}>
                {isAssistant ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>

              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-normal border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                isAssistant 
                  ? 'bg-white text-black rounded-tl-none' 
                  : 'bg-[#FFE66D] text-black rounded-tr-none'
              }`}>
                {msg.text}
              </div>
            </div>
          );
        })}

        {isGenerating && (
          <div className="flex items-start gap-2.5 animate-pulse">
            <div className="h-7 w-7 rounded-lg bg-black border-2 border-black flex items-center justify-center text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-white border-2 border-black rounded-2xl rounded-tl-none px-4 py-2.5 text-xs text-slate-600 font-mono">
              Coalescing rescue plan...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Interaction Panel (Quick prompt chips & Speech indicator) */}
      <div className="p-3 border-t-2 border-black shrink-0 bg-[#FFFDF6]">
        {speechError && (
          <div className="mb-2 text-[10px] text-red-600 font-black flex items-center gap-1 bg-red-50 border-2 border-black px-2 py-1 rounded-md">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>{speechError}</span>
          </div>
        )}

        {/* Quick action chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
          {CHIPS.map((chip) => (
            <button
              key={chip.text}
              id={`chat-chip-${chip.text.toLowerCase().replace(/[^a-z]/g, '')}`}
              onClick={() => handleChipClick(chip.prompt)}
              disabled={isGenerating}
              className="text-[10px] font-black text-black bg-white hover:bg-[#FFE66D] border-2 border-black rounded-lg px-2.5 py-1 transition shrink-0 hover:-translate-y-0.5 active:translate-y-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
            >
              {chip.text}
            </button>
          ))}
        </div>

        {/* Text/Voice input Form */}
        <form onSubmit={handleSend} className="flex gap-2 mt-2">
          <button
            id="chat-voice-btn"
            type="button"
            onClick={toggleVoiceInput}
            className={`p-2.5 border-2 border-black rounded-xl transition shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 ${
              isListening
                ? 'bg-[#FF6B6B] text-white animate-pulse'
                : 'bg-white text-black'
            }`}
            title={isListening ? 'Listening... click to stop' : 'Tap to speak (Voice Assist)'}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>

          <input
            id="chat-text-input"
            type="text"
            placeholder={isListening ? "Listening..." : "Overwhelmed? Chat with the coach..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isGenerating}
            className="flex-1 px-3 py-2 bg-white border-2 border-black rounded-xl text-xs text-black font-black placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#FF6B6B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          />

          <button
            id="chat-send-btn"
            type="submit"
            disabled={!inputText.trim() || isGenerating}
            className="p-2.5 bg-[#4ECDC4] hover:bg-[#3dbcb3] disabled:bg-slate-100 disabled:text-slate-400 border-2 border-black text-black font-black rounded-xl transition shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0.5"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

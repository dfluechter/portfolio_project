import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import {
  Award,
  Bot,
  Check,
  Copy,
  CornerDownLeft,
  FolderGit2,
  MessageSquare,
  RotateCcw,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useSendAIChatMessage } from '../../hooks/usePortfolio';
import type { ChatMessage, ChatSourceItem } from '../../types';

const INITIAL_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'model',
  text: 'Hallo! Ich bin Dominiks Portfolio-Copilot. Frag mich gerne zu seinen Projekten, seinem Tech-Stack (Django 5, React 19, Cloud) oder verifizierten Zertifikaten.',
  timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
  sources: ["Dominik's Portfolio Knowledge Base"],
};

const QUICK_PROMPTS = [
  '🎯 Welche Top-Skills hat Dominik?',
  '🚀 Zeige mir seine Highlight-Projekte',
  '📜 Welche Zertifikate sind verifiziert?',
  '💼 Welchen beruflichen Werdegang hat er?',
];

export const PortfolioChatWidget: FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const chatMutation = useSendAIChatMessage();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-Scroll zum Ende bei neuen Nachrichten
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Fokus auf das Eingabefeld setzen beim Öffnen
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // ESC schließt das Chat-Widget
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // In die Zwischenablage kopieren mit Feedback
  const handleCopyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      // Fallback falls Clipboard-API im Browser blockiert ist
    }
  };

  // Deep-Linking & Highlight bei Klick auf strukturierte Quellen
  const handleSourceClick = (source: ChatSourceItem) => {
    if (typeof source === 'string') return;

    let targetElement: HTMLElement | null = null;

    if (source.target_id) {
      targetElement = document.getElementById(source.target_id);
    }

    // Fallback: Wenn Element mit target_id nicht existiert oder target_id fehlt
    if (!targetElement) {
      if (source.type === 'project') {
        targetElement = document.getElementById('projects');
      } else if (source.type === 'certificate') {
        targetElement = document.getElementById('certificates');
      }
    }

    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Visueller Highlight-Ring für 2 Sekunden (ui-skills style)
      const highlightClasses = [
        'ring-4',
        'ring-indigo-500/80',
        'rounded-3xl',
        'transition-all',
        'duration-500',
        'shadow-xl',
        'shadow-indigo-500/20',
      ];
      targetElement.classList.add(...highlightClasses);
      setTimeout(() => {
        targetElement?.classList.remove(...highlightClasses);
      }, 2000);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputValue).trim();
    if (!text || chatMutation.isPending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputValue('');

    // Letzte 6 Nachrichten als Historie formatieren
    const history = nextMessages
      .filter((m) => m.id !== 'welcome')
      .slice(-6)
      .map((m) => ({ role: m.role, text: m.text }));

    try {
      const response = await chatMutation.mutateAsync({
        message: text,
        history,
      });

      const modelMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        sources: response.sources,
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'model',
        text: 'Entschuldigung, der KI-Dienst ist gerade nicht erreichbar. Bitte versuche es später noch einmal.',
        timestamp: new Date().toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        ...INITIAL_MESSAGE,
        timestamp: new Date().toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ]);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Floating Chat Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Portfolio AI Copilot Chat"
          className="mb-3 w-[92vw] sm:w-[440px] h-[560px] max-h-[82vh] flex flex-col bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-2xl shadow-indigo-500/10 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          {/* Header */}
          <div className="px-5 py-3.5 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-400/25 flex items-center justify-center text-indigo-400 shadow-sm shadow-indigo-500/20">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-tight">Dominik&apos;s Copilot</h3>
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">RAG via Gemini 3.8 Flash</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetChat}
                title="Chat zurücksetzen"
                aria-label="Chat zurücksetzen"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 active:scale-95 transition-all duration-150"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Chat schließen"
                aria-label="Chat schließen"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 active:scale-95 transition-all duration-150"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div
            role="log"
            aria-live="polite"
            className="flex-1 overflow-y-auto p-4 space-y-4 text-xs bg-slate-50/40 dark:bg-slate-950/40 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`group/msg flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'model' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`relative max-w-[82%] rounded-2xl px-4 py-3 leading-relaxed whitespace-pre-wrap transition-shadow ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/20 rounded-tr-xs'
                      : 'bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800/80 shadow-sm rounded-tl-xs hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <p>{msg.text}</p>

                  {/* Interaktive Quellen (Deep-Linking & Interactive Citations) */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        Quellen:
                      </span>
                      {msg.sources.map((source, idx) => {
                        if (typeof source === 'string') {
                          return (
                            <span
                              key={`str-${idx}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px]"
                            >
                              <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                              {source}
                            </span>
                          );
                        }

                        return (
                          <button
                            key={`source-${source.id ?? idx}`}
                            type="button"
                            onClick={() => handleSourceClick(source)}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50/80 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 text-[10px] font-medium transition-all hover:scale-105 active:scale-95 shadow-sm group/btn cursor-pointer"
                            title={`Zu "${source.title}" springen`}
                            aria-label={`Quelle anzeigen: ${source.title}`}
                          >
                            {source.type === 'project' && (
                              <FolderGit2 className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            )}
                            {source.type === 'certificate' && (
                              <Award className="w-2.5 h-2.5 text-violet-600 dark:text-violet-400 shrink-0" />
                            )}
                            {source.type !== 'project' && source.type !== 'certificate' && (
                              <Sparkles className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                            )}
                            <span className="group-hover/btn:underline">{source.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Footer & Copy-Button */}
                  <div
                    className={`flex items-center justify-between gap-3 mt-1.5 text-[10px] ${
                      msg.role === 'user'
                        ? 'text-indigo-200'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    <span className="font-mono tabular-nums">{msg.timestamp}</span>

                    {msg.role === 'model' && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(msg.id, msg.text)}
                        title={copiedMessageId === msg.id ? 'Kopiert!' : 'Antwort kopieren'}
                        aria-label="Antwort in die Zwischenablage kopieren"
                        className="opacity-0 group-hover/msg:opacity-100 focus:opacity-100 flex items-center gap-1 p-0.5 rounded hover:text-slate-700 dark:hover:text-slate-300 active:scale-95 transition-all duration-150"
                      >
                        {copiedMessageId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-[9px] text-emerald-500 font-medium">Kopiert</span>
                          </>
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {/* Thinking Indicator (ui-skills bouncing spark) */}
            {chatMutation.isPending && (
              <div className="flex gap-2.5 items-center text-slate-500 dark:text-slate-400 text-xs py-1">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 animate-spin duration-1000" />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1.5 font-medium">Copilot denkt nach...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts (Taktile Chips nach ui-skills) */}
          {messages.length <= 2 && (
            <div className="px-3.5 py-2 bg-white/95 dark:bg-slate-900/95 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  disabled={chatMutation.isPending}
                  className="px-2.5 py-1 rounded-full bg-slate-100/80 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-[11px] font-medium whitespace-nowrap border border-slate-200/60 dark:border-slate-700/60 active:scale-95 transition-all duration-150 disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            aria-label="Nachricht an KI-Assistent senden"
            className="p-3 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="Frage zu Dominiks Portfolio stellen..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={chatMutation.isPending}
              className="flex-1 px-3.5 py-2 bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || chatMutation.isPending}
              aria-label="Nachricht senden"
              className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white flex items-center justify-center active:scale-90 transition-all duration-150 shadow-md shadow-indigo-600/25 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
            >
              <CornerDownLeft className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Trigger Button (UI Skills Puls & Haptik) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Chatbot schließen' : 'Portfolio KI-Assistent öffnen'}
        aria-expanded={isOpen}
        className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 text-white shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 cursor-pointer border border-white/10"
      >
        <div className="relative">
          {isOpen ? (
            <X className="w-5 h-5 transition-transform group-hover:rotate-90 duration-200" />
          ) : (
            <>
              <MessageSquare className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 border-2 border-indigo-600" />
              </span>
            </>
          )}
        </div>
        <span className="text-xs font-bold tracking-wide">
          {isOpen ? 'Schließen' : 'Frag Dominiks KI'}
        </span>
      </button>
    </div>
  );
};

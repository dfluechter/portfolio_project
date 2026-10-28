import { useEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';
import {
  Award,
  Bot,
  Check,
  Copy,
  CornerDownLeft,
  ExternalLink,
  FolderGit2,
  MessageSquare,
  RotateCcw,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSendAIChatMessage } from '../../hooks/usePortfolio';
import type { ChatMessage, ChatSourceItem } from '../../types';

interface ChatHistoryEntry {
  role: 'user' | 'model';
  text: string;
}

let chatMessageSequence = 0;

const createChatMessageId = (prefix: string): string => {
  chatMessageSequence += 1;
  return `${prefix}-${chatMessageSequence}`;
};

const formatChatTimestamp = (date: Date = new Date()): string => {
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
};

const SECTION_ID_MAP: Record<string, string> = {
  project: 'projects',
  certificate: 'certificates',
};

const scrollToAndHighlightSource = (
  source: ChatSourceItem,
  block: ScrollLogicalPosition = 'center'
): void => {
  if (typeof source === 'string') return;

  let targetElement: HTMLElement | null = null;

  if (source.target_id) {
    targetElement = document.getElementById(source.target_id);
  }

  // Fallback: Wenn Element mit target_id nicht existiert oder target_id fehlt
  if (!targetElement && source.type && SECTION_ID_MAP[source.type]) {
    targetElement = document.getElementById(SECTION_ID_MAP[source.type]);
  }

  if (targetElement) {
    targetElement.scrollIntoView({ behavior: 'smooth', block });

    // Visueller Highlight-Ring (2200ms)
    const highlightClasses = [
      'ring-2',
      'ring-cyan-400/80',
      'rounded-3xl',
      'transition-all',
      'duration-500',
      'shadow-xl',
      'shadow-indigo-500/20',
    ];
    targetElement.classList.add(...highlightClasses);
    setTimeout(() => {
      targetElement?.classList.remove(...highlightClasses);
    }, 2200);
  }
};

const MAX_INPUT_CHARS = 500;
const MAX_SESSION_USER_MESSAGES = 10;

const buildChatHistory = (
  messages: ChatMessage[],
  limit = 8,
  maxChars = MAX_INPUT_CHARS
): ChatHistoryEntry[] => {
  return messages
    .filter((m) => m.id !== 'welcome')
    .slice(-limit)
    .map((m) => ({
      role: m.role,
      text: m.text.slice(0, maxChars),
    }));
};

const DEFAULT_WELCOME_DE =
  'Hallo! Ich bin Dominiks Portfolio-Copilot. Frag mich gerne zu seinen Projekten, seinem Tech-Stack (Django 5, React 19, Cloud) oder verifizierten Zertifikaten.';

interface SourceTypeConfig {
  label: string;
  icon: typeof FolderGit2;
  iconClass: string;
}

const SOURCE_TYPE_META: Record<string, SourceTypeConfig> = {
  project: {
    label: 'Projekt',
    icon: FolderGit2,
    iconClass: 'text-indigo-600 dark:text-indigo-400',
  },
  certificate: {
    label: 'Zertifikat',
    icon: Award,
    iconClass: 'text-violet-600 dark:text-violet-400',
  },
};

export interface ChatSourceBadgesProps {
  sources?: ChatSourceItem[];
  onSourceClick: (source: ChatSourceItem) => void;
}

export const ChatSourceBadges: FC<ChatSourceBadgesProps> = ({
  sources,
  onSourceClick,
}) => {
  const { t } = useTranslation();

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
        {t('chat.sourcesLabel', 'Quellen:')}
      </span>
      {sources.map((source, idx) => {
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

        const meta = source.type ? SOURCE_TYPE_META[source.type] : undefined;
        const IconComponent = meta ? meta.icon : Sparkles;
        const iconClass = meta ? meta.iconClass : 'text-amber-500';

        return (
          <button
            key={`source-${source.id ?? idx}`}
            type="button"
            onClick={() => onSourceClick(source)}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50/80 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 text-[10px] font-medium transition-all hover:scale-105 active:scale-95 shadow-sm group/btn cursor-pointer"
            title={t('chat.jumpToTitle', {
              title: source.title,
              defaultValue: `Zu "${source.title}" springen`,
            })}
            aria-label={t('chat.showSourceAria', {
              title: source.title,
              defaultValue: `Quelle anzeigen: ${source.title}`,
            })}
          >
            <IconComponent className={`w-2.5 h-2.5 ${iconClass} shrink-0`} />
            <span className="group-hover/btn:underline">{source.title}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover/btn:opacity-100 shrink-0 transition-opacity" />
          </button>
        );
      })}
    </div>
  );
};

export interface ChatMessageBubbleProps {
  message: ChatMessage;
  copiedMessageId: string | null;
  onCopyText: (id: string, text: string) => void;
  onSourceClick: (source: ChatSourceItem) => void;
}

export const ChatMessageBubble: FC<ChatMessageBubbleProps> = ({
  message,
  copiedMessageId,
  onCopyText,
  onSourceClick,
}) => {
  const { t } = useTranslation();
  const isUser = message.role === 'user';

  return (
    <div
      className={`group/msg flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
      )}

      <div
        className={`relative max-w-[82%] rounded-2xl px-4 py-3 leading-relaxed whitespace-pre-wrap transition-shadow ${
          isUser
            ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/20 rounded-tr-xs'
            : 'bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800/80 shadow-sm rounded-tl-xs hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <p>{message.text}</p>

        {/* Interaktive Quellen */}
        <ChatSourceBadges
          sources={message.sources}
          onSourceClick={onSourceClick}
        />

        {/* Footer & Copy-Button */}
        <div
          className={`flex items-center justify-between gap-3 mt-1.5 text-[10px] ${
            isUser ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          <span className="font-mono tabular-nums">{message.timestamp}</span>

          {!isUser && (
            <button
              type="button"
              onClick={() => onCopyText(message.id, message.text)}
              title={copiedMessageId === message.id ? t('chat.copiedTitle', 'Kopiert!') : t('chat.copyReplyTitle', 'Antwort kopieren')}
              aria-label={t('chat.copyAria', 'Antwort in die Zwischenablage kopieren')}
              className="opacity-0 group-hover/msg:opacity-100 focus:opacity-100 flex items-center gap-1 p-0.5 rounded hover:text-slate-700 dark:hover:text-slate-300 active:scale-95 transition-all duration-150"
            >
              {copiedMessageId === message.id ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-[9px] text-emerald-500 font-medium">{t('chat.copiedFeedback', 'Kopiert')}</span>
                </>
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5" />
        </div>
      )}
    </div>
  );
};

export interface ChatThinkingIndicatorProps {
  label?: string;
}

export const ChatThinkingIndicator: FC<ChatThinkingIndicatorProps> = ({
  label = 'Analysiere Portfolio-Wissen...',
}) => {
  return (
    <div className="flex gap-2.5 items-center text-slate-500 dark:text-slate-400 text-xs py-1">
      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
        <Sparkles className="w-3.5 h-3.5 animate-spin duration-1000" />
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <span
          className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
        <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1.5 font-medium">
          {label}
        </span>
      </div>
    </div>
  );
};

export const PortfolioChatWidget: FC = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const welcomeText = t('chat.welcomeText', DEFAULT_WELCOME_DE);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'model',
      text: DEFAULT_WELCOME_DE,
      timestamp: formatChatTimestamp(),
      sources: ["Dominik's Portfolio Knowledge Base"],
    },
  ]);

  const displayedMessages = useMemo(
    () =>
      messages.map((m) => (m.id === 'welcome' ? { ...m, text: welcomeText } : m)),
    [messages, welcomeText]
  );

  const suggestedPrompts = useMemo(
    () => [
      t('chat.prompt1', '🎯 Welche Top-Skills hat Dominik?'),
      t('chat.prompt2', '🚀 Zeige mir seine Highlight-Projekte'),
      t('chat.prompt3', '📜 Welche Zertifikate sind verifiziert?'),
      t('chat.prompt4', '💼 Welchen beruflichen Werdegang hat er?'),
    ],
    [t]
  );

  const [inputValue, setInputValue] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isDisabled, setIsDisabled] = useState(false);

  const chatMutation = useSendAIChatMessage();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isFeatureDisabledByEnv =
    import.meta.env.VITE_AI_CHAT_ENABLED === 'false' ||
    import.meta.env.VITE_AI_CHAT_ENABLED === '0';

  // Auto-Scroll zum Ende bei neuen Nachrichten
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Fokus auf das Eingabefeld setzen beim Öffnen
  useEffect(() => {
    if (isOpen && !isDisabled) {
      inputRef.current?.focus();
    }
  }, [isOpen, isDisabled]);

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

  if (isFeatureDisabledByEnv) {
    return null;
  }

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

  const handleSourceClick = (source: ChatSourceItem) => {
    scrollToAndHighlightSource(source);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputValue).trim().slice(0, MAX_INPUT_CHARS);
    if (!text || chatMutation.isPending || isDisabled) return;

    const userCount = messages.filter((m) => m.role === 'user').length;
    if (userCount >= MAX_SESSION_USER_MESSAGES) {
      setIsDisabled(true);
      setMessages((prev) => [
        ...prev,
        {
          id: createChatMessageId('limit'),
          role: 'model',
          text: t(
            'chat.sessionLimitReached',
            'Das Sitzungs-Limit für kostenfreie KI-Anfragen wurde erreicht. Zum Schutz vor Token-Überschreitungen wurde der Chat für diese Sitzung deaktiviert.'
          ),
          timestamp: formatChatTimestamp(),
        },
      ]);
      return;
    }

    const userMsg: ChatMessage = {
      id: createChatMessageId('user'),
      role: 'user',
      text,
      timestamp: formatChatTimestamp(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputValue('');

    const history = buildChatHistory(nextMessages);
    const activeLang = i18n.language && i18n.language.startsWith('en') ? 'en' : 'de';

    try {
      const response = await chatMutation.mutateAsync({
        message: text,
        history,
        language: activeLang,
      });

      if (response.disabled || userCount + 1 >= MAX_SESSION_USER_MESSAGES) {
        setIsDisabled(true);
      }

      const modelMsg: ChatMessage = {
        id: createChatMessageId('model'),
        role: 'model',
        text: response.reply,
        timestamp: formatChatTimestamp(),
        sources: response.sources,
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: unknown) {
      const status =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      if (status === 429 || status === 503) {
        setIsDisabled(true);
      }
      const errorMsg: ChatMessage = {
        id: createChatMessageId('error'),
        role: 'model',
        text:
          status === 429
            ? t(
                'chat.rateLimitReached',
                'Das kostenfreie Anfrage-Limit wurde erreicht. Die KI-Komponente wurde zum Schutz vor Kosten deaktiviert.'
              )
            : t(
                'chat.serviceUnavailable',
                'Entschuldigung, der KI-Dienst ist gerade nicht erreichbar. Bitte versuche es später noch einmal.'
              ),
        timestamp: formatChatTimestamp(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        text: welcomeText,
        timestamp: formatChatTimestamp(),
        sources: ["Dominik's Portfolio Knowledge Base"],
      },
    ]);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Floating Chat Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="KI-Portfolio-Assistent"
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
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {t('chat.headerTitle', "Portfolio KI-Assistent · Dominik's Copilot")}
                  </h3>
                  {isDisabled ? (
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      {t('chat.disabledBadge', 'Deaktiviert (Token-Schutz)')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                      </span>
                      {t('chat.onlineBadge', 'Online')}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  RAG · Grounded in Portfolio Data
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetChat}
                title={t('chat.resetAria', 'Konversation zurücksetzen')}
                aria-label={t('chat.resetAria', 'Konversation zurücksetzen')}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 active:scale-95 transition-all duration-150"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title={t('chat.closeAria', 'Chat schließen')}
                aria-label={t('chat.closeAria', 'Chat schließen')}
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
            {displayedMessages.map((msg) => (
              <ChatMessageBubble
                key={msg.id}
                message={msg}
                copiedMessageId={copiedMessageId}
                onCopyText={handleCopyText}
                onSourceClick={handleSourceClick}
              />
            ))}

            {/* Thinking Indicator */}
            {chatMutation.isPending && (
              <ChatThinkingIndicator label={t('chat.thinkingLabel', 'Analysiere Portfolio-Wissen...')} />
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 2 && !isDisabled && (
            <div className="px-3.5 py-2 bg-white/95 dark:bg-slate-900/95 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    void handleSendMessage(prompt);
                  }}
                  disabled={chatMutation.isPending || isDisabled}
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
              void handleSendMessage();
            }}
            aria-label="Nachricht an den KI-Assistenten"
            className="p-3 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              maxLength={MAX_INPUT_CHARS}
              placeholder={
                isDisabled
                  ? (i18n.language.startsWith('en') ? 'AI Assistant disabled (token limit)' : 'KI-Assistent deaktiviert (Token-Limit geschützt)')
                  : t('chat.inputPlaceholder')
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={chatMutation.isPending || isDisabled}
              className="flex-1 px-3.5 py-2 bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || chatMutation.isPending || isDisabled}
              aria-label={t('chat.send', 'Senden')}
              className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white flex items-center justify-center active:scale-90 transition-all duration-150 shadow-md shadow-indigo-600/25 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
            >
              <CornerDownLeft className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={
          isOpen
            ? t('chat.triggerCloseAria', 'KI-Assistent schließen')
            : t('chat.triggerOpenAria', 'Portfolio KI-Assistent öffnen – Frag die KI über dieses Portfolio')
        }
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
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400 border-2 border-indigo-600" />
              </span>
            </>
          )}
        </div>
        <span className="text-xs font-bold tracking-wide">
          {isOpen ? t('chat.triggerCloseLabel', 'Schließen') : t('chat.triggerOpenLabel', 'Frag Dominiks KI')}
        </span>
        <span className="text-[10px] uppercase font-semibold bg-white/20 px-1.5 py-0.5 rounded-full tracking-wider">
          {t('chat.triggerBadge', 'KI-Chat')}
        </span>
      </button>
    </div>
  );
};

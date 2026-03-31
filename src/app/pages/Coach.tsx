import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Bot, User, Loader2, AlertCircle, Sparkles, RotateCcw, ExternalLink, CheckCircle2, RefreshCw, TrendingUp, Crosshair, Shield, Swords, Target, Brain } from "lucide-react";
import { cn } from "../components/ui/utils";
import {
  sendCoachMessage,
  checkOllama,
  SUGGESTED_QUESTIONS,
  type ChatMessage,
  type OllamaStatus,
} from "../services/coachService";
import { getMatchHistory, type MatchData } from "../services/dataService";
import { RANKED_QUEUE_IDS } from "../utils/analytics";
import { useAsyncData } from "../hooks/useAsyncData";
import { useLanguage } from "../contexts/LanguageContext";

// ─── Suggested questions with icons ──────────────────────────────────────────
const QUESTION_ICONS = [Brain, TrendingUp, Swords, Shield, Target, Crosshair];

// ─── Setup Banner ─────────────────────────────────────────────────────────────

function OllamaSetupBanner({ onRetry }: { onRetry: () => void }) {
  const { t } = useLanguage();
  const steps = [
    { n: 1, text: t("coach.setup.step1"), sub: t("coach.setup.step1.sub"), link: "https://ollama.com/download" },
    { n: 2, text: t("coach.setup.step2"), sub: t("coach.setup.step2.sub") },
    { n: 3, text: t("coach.setup.step3"), sub: t("coach.setup.step3.sub") },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-5 rounded-2xl border border-border/60 bg-card card-shine"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-[14px] font-semibold text-foreground mb-1">{t("coach.setup.title")}</p>
          <p className="text-[12px] text-muted-foreground leading-relaxed mb-4">
            {t("coach.setup.desc")} <strong className="text-foreground">{t("coach.setup.free")}</strong>. {t("coach.setup.once")}
          </p>
          <div className="space-y-3 mb-4">
            {steps.map(step => (
              <div key={step.n} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0 mt-0.5">{step.n}</span>
                <div>
                  <p className="text-[12px] font-medium text-foreground">{step.text}</p>
                  {step.link ? (
                    <a href={step.link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline flex items-center gap-1">
                      {step.sub} <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : (
                    <p className="text-[11px] text-muted-foreground font-mono">{step.sub}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button onClick={onRetry} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" />
            {t("coach.setup.retry")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function NoModelsBanner({ onRetry }: { onRetry: () => void }) {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-[13px] font-semibold text-foreground mb-1">{t("coach.noModels.title")}</p>
          <p className="text-[12px] text-muted-foreground mb-3">{t("coach.noModels.run")}</p>
          <code className="block text-[12px] font-mono bg-secondary/60 px-3 py-2 rounded-lg text-foreground mb-3">ollama pull llama3.2</code>
          <p className="text-[11px] text-muted-foreground mb-3">{t("coach.noModels.size")}</p>
          <button onClick={onRetry} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-[12px] font-medium hover:bg-secondary/80 transition-colors cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" />
            {t("coach.retry")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, isStreaming }: { msg: ChatMessage; isStreaming?: boolean }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex gap-3 max-w-full", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
        isUser ? "bg-primary/20" : "bg-secondary"
      )}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-primary" />
          : <Bot className="w-3.5 h-3.5 text-muted-foreground" />
        }
      </div>
      <div className={cn(
        "max-w-[80%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap",
        isUser
          ? "bg-primary text-primary-foreground rounded-tr-sm"
          : "bg-secondary/60 text-foreground rounded-tl-sm border border-border/30"
      )}>
        {msg.content}
        {isStreaming && (
          <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-current opacity-60 animate-pulse rounded-full align-middle" />
        )}
      </div>
    </motion.div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Coach() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [checkingOllama, setCheckingOllama] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: allMatches } = useAsyncData<MatchData[]>(() => getMatchHistory(), []);
  const ranked = allMatches?.filter(m => RANKED_QUEUE_IDS.has(m.queueId));
  const matches = ranked && ranked.length > 0 ? ranked : allMatches;

  const refreshOllamaStatus = useCallback(async () => {
    setCheckingOllama(true);
    const status = await checkOllama(true);
    setOllamaStatus(status);
    setCheckingOllama(false);
  }, []);

  useEffect(() => { refreshOllamaStatus(); }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setError(null);
    setStreamingContent("");

    try {
      let accumulated = "";
      const fullResponse = await sendCoachMessage(
        newMessages,
        matches ?? [],
        (delta) => { accumulated += delta; setStreamingContent(accumulated); },
        () => { setStreamingContent(""); },
      );
      setMessages(prev => [...prev, { role: "assistant", content: fullResponse }]);
    } catch (err: any) {
      if (err?.message === "OLLAMA_UNAVAILABLE") {
        await refreshOllamaStatus();
        setError(t("coach.err.unavailable"));
      } else if (err?.message === "NO_MODELS") {
        await refreshOllamaStatus();
        setError(t("coach.err.noModels"));
      } else {
        setError(err?.message ?? t("coach.err.unknown"));
      }
    } finally {
      setIsLoading(false);
    }
  }, [messages, matches, isLoading, refreshOllamaStatus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isReady = ollamaStatus?.available && !!ollamaStatus?.bestModel;
  const isEmpty = messages.length === 0 && !streamingContent;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-h-[840px] font-sans">

      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-primary" />
            AI Coach
          </h1>
          <p className="text-[14px] text-muted-foreground mt-1 flex items-center gap-2">
            {t("coach.subtitle")}
            {isReady && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-500">
                <CheckCircle2 className="w-3 h-3" />
                {ollamaStatus!.bestModel}
              </span>
            )}
            {checkingOllama && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground/50" />
            )}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); setError(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t("coach.newConversation")}
          </button>
        )}
      </div>

      {/* Setup banners */}
      {!checkingOllama && !ollamaStatus?.available && (
        <OllamaSetupBanner onRetry={refreshOllamaStatus} />
      )}
      {!checkingOllama && ollamaStatus?.available && !ollamaStatus?.bestModel && (
        <NoModelsBanner onRetry={refreshOllamaStatus} />
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-0">

        {/* Empty state */}
        {isEmpty && isReady && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full text-center gap-6"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Bot className="w-7 h-7 text-primary" />
              </div>
              <p className="text-[15px] font-medium text-foreground">{t("coach.empty.title")}</p>
              <p className="text-[13px] text-muted-foreground mt-1 max-w-md">{t("coach.empty.sub")}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
              {SUGGESTED_QUESTIONS.map((q, i) => {
                const Icon = QUESTION_ICONS[i % QUESTION_ICONS.length];
                return (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="text-left px-4 py-3 rounded-xl border border-border/40 bg-card hover:border-primary/30 hover:bg-secondary/30 text-[12px] text-muted-foreground hover:text-foreground transition-all cursor-pointer group flex items-start gap-3 card-lift card-shine"
                  >
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-3 h-3 text-primary" />
                    </div>
                    {q}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Messages list */}
        {!isEmpty && (
          <div className="space-y-4 pb-2">
            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}

            {streamingContent && (
              <MessageBubble msg={{ role: "assistant", content: streamingContent }} isStreaming />
            )}

            {isLoading && !streamingContent && (
              <div className="flex gap-3 items-center">
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex gap-1 items-center px-4 py-3 rounded-2xl rounded-tl-sm bg-secondary/60 border border-border/30">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-destructive/8 border border-destructive/20 text-[12px] text-destructive"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="mt-4 shrink-0">
        <div className={cn(
          "flex items-end gap-2 p-2 rounded-2xl border bg-card transition-all",
          isReady ? "border-border/60 focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_rgba(var(--primary-rgb),0.06)]" : "border-border/30 opacity-50"
        )}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isReady || isLoading}
            placeholder={
              checkingOllama
                ? t("coach.placeholder.connecting")
                : !ollamaStatus?.available
                ? t("coach.placeholder.install")
                : !ollamaStatus?.bestModel
                ? t("coach.placeholder.download")
                : t("coach.placeholder.ready")
            }
            rows={1}
            className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none resize-none py-1.5 px-2 max-h-32 overflow-y-auto disabled:cursor-not-allowed"
            style={{ lineHeight: "1.5" }}
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 128) + "px";
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || !isReady || isLoading}
            className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-primary/90 transition-colors cursor-pointer disabled:cursor-not-allowed btn-press"
          >
            {isLoading
              ? <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
              : <Send className="w-4 h-4 text-primary-foreground" />
            }
          </button>
        </div>
        {isReady && (
          <p className="text-[10px] text-muted-foreground/40 mt-1.5 text-center">
            {t("coach.footer")}
          </p>
        )}
      </div>
    </div>
  );
}

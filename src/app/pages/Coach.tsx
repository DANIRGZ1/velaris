import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Bot, User, Loader2, AlertCircle, Sparkles, RotateCcw, ExternalLink, CheckCircle2, RefreshCw, TrendingUp, Crosshair, Shield, Swords, Target, Brain, Key, Settings } from "lucide-react";
import { cn } from "../components/ui/utils";
import { useNavigate, useSearchParams } from "react-router";
import {
  sendCoachMessage,
  checkGroq,
  saveGroqKey,
  loadGroqKey,
  SUGGESTED_QUESTIONS,
  type ChatMessage,
  type GroqStatus,
} from "../services/coachService";
import { getMatchHistory, type MatchData } from "../services/dataService";
import { RANKED_QUEUE_IDS } from "../utils/analytics";
import { useAsyncData } from "../hooks/useAsyncData";
import { useLanguage } from "../contexts/LanguageContext";

// ─── Suggested questions with icons ──────────────────────────────────────────
const QUESTION_ICONS = [Brain, TrendingUp, Swords, Shield, Target, Crosshair];

const COACH_HISTORY_KEY = "velaris-coach-history";
const MAX_STORED_MESSAGES = 40;

// ─── Groq Setup Banner ────────────────────────────────────────────────────────

function GroqSetupBanner({ onReady }: { onReady: () => void }) {
  const { t } = useLanguage();
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const handleSave = async () => {
    const trimmed = key.trim();
    if (!trimmed.startsWith("gsk_")) {
      setError(true);
      return;
    }
    setSaving(true);
    await saveGroqKey(trimmed);
    setSaving(false);
    onReady();
  };

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
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0 mt-0.5">1</span>
              <div>
                <p className="text-[12px] font-medium text-foreground">{t("coach.setup.step1")}</p>
                <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline flex items-center gap-1">
                  {t("coach.setup.step1.sub")} <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0 mt-0.5">2</span>
              <div>
                <p className="text-[12px] font-medium text-foreground">{t("coach.setup.step2")}</p>
                <p className="text-[11px] text-muted-foreground">{t("coach.setup.step2.sub")}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Key className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
              <input
                type="password"
                value={key}
                onChange={e => { setKey(e.target.value); setError(false); }}
                onKeyDown={e => e.key === "Enter" && handleSave()}
                placeholder="gsk_..."
                className={cn(
                  "w-full pl-8 pr-3 py-2 rounded-lg border bg-secondary/30 text-[12px] font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 transition-colors",
                  error ? "border-rose-500/60 focus:ring-rose-500/20" : "border-border/50 focus:ring-primary/20"
                )}
              />
            </div>
            <button
              onClick={handleSave}
              disabled={!key.trim() || saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {t("coach.setup.save")}
            </button>
          </div>
          {error && (
            <p className="text-[11px] text-rose-400 mt-1.5">{t("coach.setup.keyError")}</p>
          )}
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(COACH_HISTORY_KEY);
      if (stored) return JSON.parse(stored) as ChatMessage[];
    } catch {}
    return [];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [groqStatus, setGroqStatus] = useState<GroqStatus>(() => checkGroq());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoAnalyzeFired = useRef(false);

  const { data: allMatches } = useAsyncData<MatchData[]>(() => getMatchHistory(), []);
  const ranked = allMatches?.filter(m => RANKED_QUEUE_IDS.has(m.queueId));
  const matches = ranked && ranked.length > 0 ? ranked : allMatches;

  const refreshGroqStatus = useCallback(() => {
    setGroqStatus(checkGroq());
  }, []);

  // ── Contextual suggestions derived from recent match data ──────────────────
  const contextualQuestions = useMemo(() => {
    if (!matches || matches.length === 0) return SUGGESTED_QUESTIONS;
    const last = matches[0];
    const player = last.participants.find(p => p.puuid === last.localPlayerPuuid);
    if (!player) return SUGGESTED_QUESTIONS;

    const champ = player.championName;
    const won = player.win;
    const deaths = player.deaths;
    const csMin = (player.totalMinionsKilled / (last.gameDuration / 60)).toFixed(1);
    const kp = last.participants
      .filter((_, i) => {
        const teamId = player.teamId;
        return last.participants[i]?.teamId === teamId;
      })
      .reduce((sum, p) => sum + p.kills, 0);

    const questions: string[] = [];

    questions.push(
      won
        ? `I just won with ${champ}. What were my likely key decisions that led to victory?`
        : `I just lost with ${champ}. What should I focus on improving for next game?`
    );

    if (deaths >= 6) {
      questions.push(`I died ${deaths} times last game. How do I reduce deaths as ${champ}?`);
    } else {
      questions.push(`What are the most impactful macro moves I should be making as ${champ}?`);
    }

    const csNum = parseFloat(csMin);
    if (csNum < 6.5) {
      questions.push(`My CS was ${csMin}/min last game. What's the fastest way to improve farming?`);
    } else {
      questions.push(`How do I convert good laning into a mid-game lead with ${champ}?`);
    }

    questions.push(`What matchups does ${champ} struggle against and how to handle them?`);

    return questions.slice(0, 4);
  }, [matches]);

  // On mount: sync Groq key from secure storage → localStorage
  useEffect(() => {
    loadGroqKey().then(() => setGroqStatus(checkGroq()));
  }, []);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    try {
      const toStore = messages.slice(-MAX_STORED_MESSAGES);
      localStorage.setItem(COACH_HISTORY_KEY, JSON.stringify(toStore));
    } catch {}
  }, [messages]);

  // Auto-analyze after a game when ?autoAnalyze=1 is present
  useEffect(() => {
    if (autoAnalyzeFired.current) return;
    if (!searchParams.get("autoAnalyze")) return;
    if (!groqStatus.available) return;
    if (!matches) return;

    autoAnalyzeFired.current = true;
    const champ = searchParams.get("champ") ?? "";
    const won = searchParams.get("win") === "1";
    const question = champ
      ? `I just played ${champ} and ${won ? "won" : "lost"}. Give me a concise post-game analysis: what likely went well, what to improve, and one concrete focus for next game.`
      : `Give me a concise post-game analysis of my last game: what likely went well, what to improve, and one concrete focus for next game.`;

    // Clear the URL params without re-render loop
    setSearchParams({}, { replace: true });
    sendMessage(question);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groqStatus.available, matches, searchParams, t]);

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

    let accumulated = "";
    try {
      const fullResponse = await sendCoachMessage(
        newMessages,
        matches ?? [],
        (delta) => { accumulated += delta; setStreamingContent(accumulated); },
        () => { setStreamingContent(""); },
      );
      setMessages(prev => [...prev, { role: "assistant", content: fullResponse }]);
    } catch (err: any) {
      // Save any partial streamed content before showing error
      if (accumulated.trim()) {
        setMessages(prev => [...prev, { role: "assistant", content: accumulated }]);
        setStreamingContent("");
      }
      if (err?.message === "GROQ_NO_KEY") {
        refreshGroqStatus();
        setError(t("coach.err.noKey"));
      } else if (err?.message === "GROQ_INVALID_KEY") {
        refreshGroqStatus();
        setError(t("coach.err.invalidKey"));
      } else if (err?.message === "GROQ_RATE_LIMIT") {
        setError(t("coach.err.rateLimit"));
        setTimeout(() => setError(null), 6000);
      } else {
        setError(err?.message ?? t("coach.err.unknown"));
      }
    } finally {
      setIsLoading(false);
    }
  }, [messages, matches, isLoading, refreshGroqStatus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isReady = groqStatus.available;
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
                Groq · llama-3.3-70b
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isReady && (
            <button
              onClick={() => navigate("/settings?tab=account")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors cursor-pointer"
              title={t("coach.manageKey")}
            >
              <Key className="w-3.5 h-3.5" />
            </button>
          )}
          {messages.length > 0 && (
            <button
              onClick={() => {
                setMessages([]);
                setError(null);
                try { localStorage.removeItem(COACH_HISTORY_KEY); } catch {}
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t("coach.newConversation")}
            </button>
          )}
        </div>
      </div>

      {/* Setup banner */}
      {!isReady && (
        <GroqSetupBanner onReady={refreshGroqStatus} />
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
              {contextualQuestions.map((q, i) => {
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
              !isReady
                ? t("coach.placeholder.install")
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

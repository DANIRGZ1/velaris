import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, CheckCheck, Flame, Trophy, Eye, BookOpen, Zap, FileText, AlertTriangle, X, ArrowRight } from "lucide-react";
import { cn } from "./ui/utils";
import { useNavigate } from "react-router";
import { getNotifications, markNotificationRead, markAllNotificationsRead, type AppNotification } from "../services/dataService";
import { useLanguage } from "../contexts/LanguageContext";

const TYPE_CONFIG: Record<AppNotification["type"], { icon: typeof Bell; color: string; bg: string }> = {
  info: { icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10" },
  success: { icon: Trophy, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
  streak: { icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10" },
  patch: { icon: FileText, color: "text-purple-500", bg: "bg-purple-500/10" },
  learning: { icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
  insight: { icon: Zap, color: "text-cyan-500", bg: "bg-cyan-500/10" },
};

function timeAgo(timestamp: number, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("notif.time.now");
  if (mins < 60) return t("notif.time.mins", { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("notif.time.hours", { n: hours });
  const days = Math.floor(hours / 24);
  return t("notif.time.days", { n: days });
}

export function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Load once on mount so the unread badge is visible before opening
  useEffect(() => {
    getNotifications(t).then(setNotifications);
  }, [t]);

  // Refresh when panel opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getNotifications(t).then((data) => {
        setNotifications(data);
        setIsLoading(false);
      });
    }
  }, [isOpen, t]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const handleNotificationClick = (notif: AppNotification) => {
    markNotificationRead(notif.id);
    setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
    if (notif.actionPath) {
      navigate(notif.actionPath);
      setIsOpen(false);
    }
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead(notifications);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div ref={panelRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-8 h-8 flex items-center justify-center rounded-full transition-colors relative",
          isOpen ? "bg-primary/10 text-primary" : "hover:bg-secondary text-muted-foreground"
        )}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full right-0 mt-2 w-[380px] max-h-[480px] bg-card border border-border/60 rounded-2xl shadow-xl overflow-hidden z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-semibold text-foreground">{t("notif.title")}</h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                    {t("notif.newCount", { count: unreadCount })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                  >
                    <CheckCheck className="w-3 h-3" /> {t("notif.markAllRead")}
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-secondary transition-colors text-muted-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                  <Bell className="w-8 h-8 opacity-30" />
                  <span className="text-[13px]">{t("notif.empty")}</span>
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((notif) => {
                    const config = TYPE_CONFIG[notif.type];
                    const Icon = config.icon;
                    return (
                      <button
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={cn(
                          "flex items-start gap-3 px-5 py-3.5 text-left transition-colors border-b border-border/20 last:border-b-0 group",
                          !notif.read ? "bg-primary/[0.03]" : "hover:bg-secondary/40"
                        )}
                      >
                        {/* Icon */}
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", config.bg)}>
                          <Icon className={cn("w-4 h-4", config.color)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <span className={cn("text-[13px] leading-snug", !notif.read ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
                              {notif.title}
                            </span>
                            {!notif.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                          </div>
                          <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
                            {notif.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-muted-foreground/60 font-mono">{timeAgo(notif.timestamp, t)}</span>
                            {notif.actionPath && (
                              <span className="text-[10px] text-primary font-medium flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {t("notif.viewMore")} <ArrowRight className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-5 py-3 border-t border-border/40 bg-secondary/20">
                <p className="text-[10px] text-muted-foreground/50 text-center">
                  {t("notif.footer")}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
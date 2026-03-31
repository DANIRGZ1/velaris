import { motion } from "motion/react";
import { cn } from "../components/ui/utils";
import { Target, CheckCircle2, CircleDashed, Lock, ArrowRight } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { useNavigate } from "react-router";

export function LearningPath() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const roadmap = [
    { id: 1, title: t("learning.road1.title"), desc: t("learning.road1.desc"), status: "completed" },
    { id: 2, title: t("learning.road2.title"), desc: t("learning.road2.desc"), status: "in-progress", progress: 60 },
    { id: 3, title: t("learning.road3.title"), desc: t("learning.road3.desc"), status: "locked" },
    { id: 4, title: t("learning.road4.title"), desc: t("learning.road4.desc"), status: "locked" },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full flex flex-col gap-10 pb-20 font-sans"
    >
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("learning.progressiveDev")}</span>
        </div>
        <h1 className="text-[32px] font-semibold tracking-tight text-foreground">{t("learning.learningPath")}</h1>
      </header>

      {/* Hero / Focus Area */}
      <div className="bg-card border border-border shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] rounded-[20px] p-8 flex items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        
        <div className="flex-1 z-10 flex flex-col gap-4">
          <div>
            <h2 className="text-[11px] font-bold text-primary uppercase tracking-widest mb-1">{t("learning.currentFocus")}</h2>
            <h3 className="text-2xl font-bold text-foreground">{t("learning.visionControl")}</h3>
          </div>
          
          <p className="text-[15px] text-muted-foreground leading-relaxed max-w-xl">
            {t("learning.heroDesc")}
          </p>

          <div className="flex items-center gap-4 text-[13px] font-semibold mt-2">
            <span className="text-muted-foreground uppercase tracking-wider">{t("learning.progress")}</span>
            <div className="w-48 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full w-[60%]" />
            </div>
            <span className="text-primary font-mono">{t("learning.gamesProgress")}</span>
          </div>
        </div>
      </div>

      {/* Roadmap */}
      <div className="flex flex-col gap-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">{t("learning.yourJourney")}</h3>
        <div className="flex flex-col gap-3">
          {roadmap.map((step, index) => (
            <motion.div 
              key={step.id}
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05, duration: 0.2, ease: "easeOut" }}
              className={cn(
                "p-5 rounded-[16px] border flex items-center gap-5 transition-all",
                step.status === "completed" ? "bg-secondary border-border" :
                step.status === "in-progress" ? "bg-card border-primary/20 shadow-sm" :
                "bg-secondary/30 border-border/50 opacity-60 grayscale"
              )}
            >
              <div className="shrink-0">
                {step.status === "completed" && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
                {step.status === "in-progress" && <CircleDashed className="w-6 h-6 text-primary animate-[spin_4s_linear_infinite]" />}
                {step.status === "locked" && <Lock className="w-6 h-6 text-muted-foreground/40" />}
              </div>

              <div className="flex-1 flex flex-col gap-0.5">
                <h4 className={cn(
                  "font-semibold text-[15px]",
                  step.status === "in-progress" ? "text-foreground" : 
                  step.status === "completed" ? "text-foreground/80" : "text-muted-foreground"
                )}>
                  {t("learning.module", { id: step.id })}: {step.title}
                </h4>
                <p className={cn(
                  "text-[13px]",
                  step.status === "in-progress" ? "text-muted-foreground" : "text-muted-foreground/70"
                )}>
                  {step.desc}
                </p>
              </div>

              {step.status === "in-progress" && (
                <button 
                  onClick={() => navigate("/learning")}
                  className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-medium rounded-lg text-[13px] transition-colors flex items-center gap-1.5 ml-4 cursor-pointer"
                >
                  {t("learning.continue")} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
import { motion } from "motion/react";
import { FileText, ArrowLeft, Scale, AlertTriangle, Ban, RefreshCw, Mail } from "lucide-react";
import { useNavigate } from "react-router";
import { cn } from "../components/ui/utils";
import { useLanguage } from "../contexts/LanguageContext";

interface SectionProps {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  delay?: number;
}

function Section({ icon: Icon, title, children, delay = 0 }: SectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-3"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-[16px] font-semibold text-foreground">{title}</h2>
      </div>
      <div className="pl-[42px] flex flex-col gap-2 text-[13px] text-muted-foreground leading-relaxed">
        {children}
      </div>
    </motion.div>
  );
}

export function Terms() {
  const navigate = useNavigate();
  const { } = useLanguage();

  const lastUpdated = "March 28, 2026";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8"
    >
      {/* Header */}
      <div className="flex flex-col gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-foreground">Terms of Use</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">Last updated: {lastUpdated}</p>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05, duration: 0.4 }}
          className="text-[13px] text-muted-foreground leading-relaxed rounded-xl border border-border/40 bg-secondary/20 p-4"
        >
          By installing or using Velaris you agree to these terms. Velaris is an alpha-stage,
          free and open-source companion tool for League of Legends. It is not affiliated with,
          endorsed by, or sponsored by Riot Games.
        </motion.p>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-7">
        <Section icon={Scale} title="Acceptable Use" delay={0.1}>
          <p>Velaris is a personal performance-tracking tool. You may use it for your own accounts only.</p>
          <p>You must not use Velaris to harass, target, or gain an unfair competitive advantage against other players in a way that violates Riot Games' Terms of Service.</p>
          <p>Velaris reads data from your locally-running League client and from Riot's public APIs. It does not modify game files or memory.</p>
        </Section>

        <Section icon={AlertTriangle} title="No Warranty" delay={0.15}>
          <p>
            Velaris is provided <span className="font-semibold text-foreground">"as is"</span>, without warranty of any kind. We make no guarantees
            about uptime, accuracy of stats, or compatibility with future game patches.
          </p>
          <p>Use of the AI coach feature requires a personal Groq API key. We are not responsible for any costs or limitations imposed by Groq's service.</p>
        </Section>

        <Section icon={Ban} title="Prohibited Activities" delay={0.2}>
          <ul className="list-disc pl-4 flex flex-col gap-1.5">
            <li>Reverse engineering or redistributing Velaris for commercial purposes</li>
            <li>Using Velaris in conjunction with scripts, bots, or third-party tools that violate Riot's policies</li>
            <li>Attempting to scrape or automate Riot API requests beyond the personal use limits of your API key</li>
          </ul>
        </Section>

        <Section icon={RefreshCw} title="Changes to These Terms" delay={0.25}>
          <p>
            We may update these terms at any time. Continued use of Velaris after changes are posted
            constitutes acceptance of the revised terms. The <span className="font-medium text-foreground">last updated</span> date
            at the top of this page reflects the most recent revision.
          </p>
        </Section>

        <Section icon={Mail} title="Contact" delay={0.3}>
          <p>
            Questions or concerns? Reach us at{" "}
            <span className="font-medium text-foreground">velarisgg@gmail.com</span>.
          </p>
        </Section>
      </div>

      {/* Riot disclaimer */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "rounded-xl border border-border/40 bg-secondary/20 p-4",
          "text-[11px] text-muted-foreground leading-relaxed"
        )}
      >
        Velaris isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games
        or anyone officially involved in producing or managing Riot Games properties.{" "}
        <span className="font-medium text-foreground">
          League of Legends and all related assets are property of Riot Games, Inc.
        </span>
      </motion.div>
    </motion.div>
  );
}

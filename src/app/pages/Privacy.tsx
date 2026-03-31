import { motion } from "motion/react";
import { Shield, Lock, Eye, Database, Trash2, Globe, Server, HardDrive, ExternalLink, ArrowLeft } from "lucide-react";
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

function DataTable({ rows }: { rows: { data: string; stored: string; shared: string; purpose: string }[] }) {
  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="bg-secondary/50 border-b border-border/40">
            <th className="text-left px-3 py-2.5 font-semibold text-foreground uppercase tracking-wider text-[10px]">Data</th>
            <th className="text-left px-3 py-2.5 font-semibold text-foreground uppercase tracking-wider text-[10px]">Stored</th>
            <th className="text-left px-3 py-2.5 font-semibold text-foreground uppercase tracking-wider text-[10px]">Shared</th>
            <th className="text-left px-3 py-2.5 font-semibold text-foreground uppercase tracking-wider text-[10px]">Purpose</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={cn("border-b border-border/20 last:border-0", i % 2 === 0 ? "bg-card" : "bg-secondary/20")}>
              <td className="px-3 py-2.5 text-foreground font-medium">{row.data}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{row.stored}</td>
              <td className="px-3 py-2.5">
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                  row.shared === "Never" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                )}>
                  {row.shared}
                </span>
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">{row.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Privacy() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const lastUpdated = "March 12, 2026";
  const version = "1.0";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full flex flex-col font-sans pb-20 max-w-3xl mx-auto"
    >
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-6 self-start cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("common.back") || "Back"}
      </button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mb-10"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-foreground">Privacy Policy</h1>
            <p className="text-[13px] text-muted-foreground">
              Velaris &mdash; League of Legends Companion App
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <span className="text-[11px] text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-lg border border-border/40 font-mono">
            v{version} &middot; Last updated: {lastUpdated}
          </span>
          <span className="text-[11px] text-muted-foreground bg-emerald-500/5 text-emerald-600 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-medium">
            Riot Games Developer Policy Compliant
          </span>
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex flex-col gap-8">

        {/* Overview */}
        <Section icon={Eye} title="Overview" delay={0.05}>
          <p>
            Velaris is a desktop companion application for League of Legends, built with Tauri v2.
            It runs entirely on your local machine. <strong className="text-foreground">Velaris does not operate any servers, 
            does not collect personal information, and does not transmit your data to any third party.</strong>
          </p>
          <p>
            This policy describes what data Velaris accesses, how it is used, and how it is stored.
            Velaris is designed in compliance with the{" "}
            <a
              href="https://developer.riotgames.com/policies/general"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Riot Games Developer Policy
              <ExternalLink className="w-3 h-3" />
            </a>{" "}
            and the{" "}
            <a
              href="https://developer.riotgames.com/docs/portal#_getting-started"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Riot Games API Terms of Service
              <ExternalLink className="w-3 h-3" />
            </a>.
          </p>
        </Section>

        {/* Data We Access */}
        <Section icon={Database} title="Data We Access" delay={0.1}>
          <p>
            Velaris accesses game data through three sources. None of these involve collecting
            personally identifiable information (PII), and no data leaves your computer except
            direct API requests to Riot Games servers.
          </p>

          <div className="mt-2 flex flex-col gap-4">
            {/* Source 1: LCU */}
            <div className="p-3 bg-card rounded-xl border border-border/40">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-4 h-4 text-blue-400" />
                <span className="text-[13px] font-semibold text-foreground">League Client Update (LCU) API</span>
                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-bold uppercase">Local Only</span>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed mb-2">
                Velaris reads the League of Legends lockfile to connect to the local client process running on your machine.
                All communication happens over <code className="text-[11px] bg-secondary px-1 py-0.5 rounded font-mono">localhost (127.0.0.1)</code>.
                No API key is required. No data is sent externally.
              </p>
              <div className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">Endpoints used:</span>
                <ul className="list-disc list-inside mt-1 space-y-0.5 pl-2">
                  <li><code className="font-mono text-[10px] bg-secondary px-1 rounded">/lol-summoner/v1/current-summoner</code> &mdash; Your summoner name, level, icon</li>
                  <li><code className="font-mono text-[10px] bg-secondary px-1 rounded">/lol-match-history/v1/products/lol/&#123;puuid&#125;/matches</code> &mdash; Recent match data</li>
                  <li><code className="font-mono text-[10px] bg-secondary px-1 rounded">/lol-champ-select/v1/session</code> &mdash; Champion select session</li>
                  <li><code className="font-mono text-[10px] bg-secondary px-1 rounded">/lol-ranked/v1/ranked-stats/&#123;puuid&#125;</code> &mdash; Ranked tier and LP</li>
                  <li><code className="font-mono text-[10px] bg-secondary px-1 rounded">/lol-gameflow/v1/gameflow-phase</code> &mdash; Current game phase</li>
                </ul>
              </div>
            </div>

            {/* Source 2: Live Client */}
            <div className="p-3 bg-card rounded-xl border border-border/40">
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <span className="text-[13px] font-semibold text-foreground">Live Client Data API</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase">Local Only</span>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                During an active game, Velaris reads in-game data from the local Live Client Data API at{" "}
                <code className="text-[11px] bg-secondary px-1 py-0.5 rounded font-mono">127.0.0.1:2999</code>.
                This is a Riot-provided local API that only runs while a game is in progress. No external requests are made.
              </p>
            </div>

            {/* Source 3: Riot API */}
            <div className="p-3 bg-card rounded-xl border border-border/40">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-violet-400" />
                <span className="text-[13px] font-semibold text-foreground">Riot Games API</span>
                <span className="text-[10px] bg-violet-500/10 text-violet-400 px-1.5 py-0.5 rounded font-bold uppercase">Remote</span>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed mb-2">
                When you use the summoner search feature, Velaris makes requests to Riot Games' official API servers.
                The API key is stored securely in the Tauri backend (Rust) and is never exposed to the frontend.
              </p>
              <div className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">Endpoints used:</span>
                <ul className="list-disc list-inside mt-1 space-y-0.5 pl-2">
                  <li><code className="font-mono text-[10px] bg-secondary px-1 rounded">Account-v1</code> &mdash; Look up accounts by Riot ID (gameName#tagLine)</li>
                  <li><code className="font-mono text-[10px] bg-secondary px-1 rounded">Summoner-v4</code> &mdash; Summoner profile data (level, icon)</li>
                  <li><code className="font-mono text-[10px] bg-secondary px-1 rounded">League-v4</code> &mdash; Ranked tier information</li>
                </ul>
                <p className="mt-2">
                  <span className="font-medium text-foreground">Data returned:</span> Only publicly available game data (summoner level, rank, 
                  profile icon). No email addresses, real names, IP addresses, or other PII is accessed or stored.
                </p>
              </div>
            </div>

            {/* Source 4: Data Dragon */}
            <div className="p-3 bg-card rounded-xl border border-border/40">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-amber-400" />
                <span className="text-[13px] font-semibold text-foreground">Data Dragon CDN</span>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase">Public CDN</span>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Champion icons, item images, and game metadata are loaded from Riot's public Data Dragon CDN 
                (<code className="text-[11px] bg-secondary px-1 py-0.5 rounded font-mono">ddragon.leagueoflegends.com</code>).
                This is a public, unauthenticated CDN that requires no API key.
              </p>
            </div>
          </div>
        </Section>

        {/* Data Summary Table */}
        <Section icon={Database} title="Data Summary" delay={0.15}>
          <DataTable rows={[
            { data: "Summoner Name & Tag", stored: "Local memory only", shared: "Never", purpose: "Display in UI" },
            { data: "Match History", stored: "Local memory (session)", shared: "Never", purpose: "Analytics & learning insights" },
            { data: "Ranked Stats", stored: "Local memory (session)", shared: "Never", purpose: "Profile display & scouting" },
            { data: "Champion Select Data", stored: "Local memory (session)", shared: "Never", purpose: "Draft analysis & recommendations" },
            { data: "In-Game Stats", stored: "Local memory (session)", shared: "Never", purpose: "Live overlay data" },
            { data: "Personal Notes", stored: "Local filesystem", shared: "Never", purpose: "User-created content" },
            { data: "App Settings", stored: "Local filesystem", shared: "Never", purpose: "User preferences" },
            { data: "Searched Summoners", stored: "Local memory (cache, max 100)", shared: "Never", purpose: "Search autocomplete" },
          ]} />
        </Section>

        {/* What We Do NOT Do */}
        <Section icon={Lock} title="What We Do NOT Do" delay={0.2}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              "Collect or store email addresses, real names, or IP addresses",
              "Transmit any data to our own servers (we have none)",
              "Share data with third parties, advertisers, or analytics services",
              "Use cookies, tracking pixels, or browser fingerprinting",
              "Store Riot API responses beyond the current session",
              "Access or modify League of Legends game files",
              "Inject code into the League client or game process",
              "Collect payment information or financial data",
              "Profile or label players in ways that enable harassment",
              "Store data from other players beyond temporary session cache",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                <span className="text-red-400 text-[12px] mt-0.5 shrink-0">&#x2717;</span>
                <span className="text-[12px] text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Local Storage */}
        <Section icon={HardDrive} title="Local Data Storage" delay={0.25}>
          <p>
            All persistent data is stored exclusively on your local machine:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>
              <strong className="text-foreground">Personal Notes:</strong> Stored in your browser's localStorage 
              (or Tauri's app data directory in the desktop build). Only you can access them.
            </li>
            <li>
              <strong className="text-foreground">App Settings:</strong> Theme, language, overlay preferences. 
              Stored locally via localStorage or Tauri plugin-store.
            </li>
            <li>
              <strong className="text-foreground">Session Data:</strong> Match history, ranked stats, and champion 
              select data are held in memory during your session and discarded when you close the app.
            </li>
          </ul>
          <p>
            No data is synced to any cloud service. If you uninstall Velaris, all data is removed with it.
          </p>
        </Section>

        {/* Player Scouting */}
        <Section icon={Eye} title="Player Scouting System" delay={0.3}>
          <p>
            Velaris includes a player scouting feature that displays <strong className="text-foreground">objective statistical data</strong> about 
            teammates during champion select (winrate, KDA, champion pool, recent form).
          </p>
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl mt-1">
            <p className="text-[12px] text-foreground leading-relaxed">
              <strong>Design principles for compliance with Riot Developer Policy:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 mt-2 text-[12px]">
              <li>Tags are <strong className="text-foreground">descriptive and factual</strong> (e.g., "High Performer", "Specialist", "Hot Streak"), never accusatory or judgmental</li>
              <li>Data shown is <strong className="text-foreground">publicly available</strong> game statistics &mdash; no hidden or private data is exposed</li>
              <li>The system does <strong className="text-foreground">not label players as "smurfs"</strong>, "boosted", or with any term that could facilitate harassment</li>
              <li>All scouting data is <strong className="text-foreground">temporary</strong> and discarded when the champion select session ends</li>
              <li>Scouting information is shown <strong className="text-foreground">only for the current game session</strong> and cannot be exported or shared</li>
            </ul>
          </div>
        </Section>

        {/* Your Rights */}
        <Section icon={Trash2} title="Your Rights & Data Control" delay={0.35}>
          <p>Since all data is stored locally, you have complete control:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>
              <strong className="text-foreground">Delete all data:</strong> Use Settings &rarr; Advanced &rarr; "Reset All Data" 
              to clear all locally stored information, or simply uninstall the application.
            </li>
            <li>
              <strong className="text-foreground">Disable features:</strong> Player scouting, notifications, and overlay 
              can each be individually disabled in Settings.
            </li>
            <li>
              <strong className="text-foreground">No account required:</strong> Velaris does not require you to create an account, 
              provide an email, or register. Your identity is detected automatically from the League client lockfile.
            </li>
          </ul>
        </Section>

        {/* Third-Party Services */}
        <Section icon={Globe} title="Third-Party Services" delay={0.4}>
          <p>Velaris interacts only with the following external services:</p>
          <div className="mt-1 rounded-xl border border-border/60 overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-secondary/50 border-b border-border/40">
                  <th className="text-left px-3 py-2 font-semibold text-foreground uppercase tracking-wider text-[10px]">Service</th>
                  <th className="text-left px-3 py-2 font-semibold text-foreground uppercase tracking-wider text-[10px]">Purpose</th>
                  <th className="text-left px-3 py-2 font-semibold text-foreground uppercase tracking-wider text-[10px]">Data Sent</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/20 bg-card">
                  <td className="px-3 py-2 text-foreground font-medium">Riot Games API</td>
                  <td className="px-3 py-2 text-muted-foreground">Summoner search</td>
                  <td className="px-3 py-2 text-muted-foreground">Riot ID (gameName#tagLine) entered by user</td>
                </tr>
                <tr className="border-b border-border/20 bg-secondary/20">
                  <td className="px-3 py-2 text-foreground font-medium">Data Dragon CDN</td>
                  <td className="px-3 py-2 text-muted-foreground">Game assets (icons, images)</td>
                  <td className="px-3 py-2 text-muted-foreground">Standard HTTP requests (no PII)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2">
            No analytics services (Google Analytics, Mixpanel, etc.), no advertising networks, 
            no crash reporting services, and no social media integrations are used.
          </p>
        </Section>

        {/* Children */}
        <Section icon={Shield} title="Children's Privacy" delay={0.45}>
          <p>
            Velaris does not knowingly collect any personal information from anyone, including children under 13. 
            Since Velaris does not collect PII of any kind, no special provisions for children's data are necessary.
            Velaris is intended for use by players of League of Legends in accordance with Riot Games' age requirements.
          </p>
        </Section>

        {/* Changes */}
        <Section icon={Shield} title="Changes to This Policy" delay={0.5}>
          <p>
            If we update this privacy policy, the changes will be included in a new version of the Velaris application.
            The "Last updated" date at the top of this page will be revised. Since Velaris has no server component
            or user accounts, we cannot send notifications about policy changes &mdash; please review this page
            periodically within the app.
          </p>
        </Section>

        {/* Contact */}
        <Section icon={Globe} title="Contact" delay={0.55}>
          <p>
            If you have questions about this privacy policy or Velaris's data practices, please reach out:
          </p>
          <div className="p-3 bg-card rounded-xl border border-border/40 mt-1">
            <div className="flex flex-col gap-1.5 text-[12px]">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-16">Email:</span>
                <span className="text-foreground font-medium">privacy@velaris.app</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-16">GitHub:</span>
                <span className="text-foreground font-medium">github.com/velaris-app/velaris</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground/60 mt-2">
            Replace the contact details above with your actual contact information before distributing the application.
          </p>
        </Section>

        {/* Riot compliance badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="mt-4 p-4 bg-secondary/30 rounded-xl border border-border/40 text-center"
        >
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Velaris is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone
            officially involved in producing or managing Riot Games properties. Riot Games and all associated properties
            are trademarks or registered trademarks of Riot Games, Inc.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

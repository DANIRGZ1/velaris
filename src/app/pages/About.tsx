import { motion } from "motion/react";
import { Shield, Cpu, Globe, Zap, Info, ExternalLink, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
import { cn } from "../components/ui/utils";
import { useState, useEffect } from "react";
import { IS_TAURI, tauriInvoke } from "../helpers/tauriWindow";
import { toast } from "sonner";
import { useLanguage } from "../contexts/LanguageContext";

const FALLBACK_VERSION = "0.1.0";

const APIS = [
  {
    name: "LCU API",
    desc: "League Client Update — lectura local de partidas, campeones, historial y fases del cliente.",
    detail: "Solo accede a localhost:127.0.0.1. Nunca sale de tu máquina.",
    icon: Cpu,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
  },
  {
    name: "Live Client Data API",
    desc: "API oficial de Riot para datos en tiempo real durante partida.",
    detail: "Solo accede a localhost:127.0.0.1:2999. Solo funciona durante partida.",
    icon: Zap,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    name: "Riot Games API",
    desc: "API pública para buscar jugadores, historial de partidas y rango.",
    detail: "Requiere una API key personal. Los datos se leen pero nunca se almacenan en servidores.",
    icon: Globe,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    name: "Data Dragon CDN",
    desc: "CDN oficial de Riot para iconos de campeones, objetos y runas.",
    detail: "Solo descarga imágenes públicas. Sin autenticación.",
    icon: Shield,
    color: "text-sky-400",
    bg: "bg-sky-500/10",
  },
];

interface UpdateInfo {
  available: boolean;
  version?: string;
  notes?: string;
}

export function About() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [appVersion, setAppVersion] = useState(FALLBACK_VERSION);
  const [updateState, setUpdateState] = useState<"idle" | "checking" | "available" | "upToDate" | "installing" | "error">("idle");
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    if (IS_TAURI) {
      tauriInvoke<string>("get_app_version").then(setAppVersion).catch(() => {});
    }
  }, []);

  const checkForUpdate = async () => {
    if (!IS_TAURI) {
      toast.info(t("about.desktopOnly"));
      return;
    }
    setUpdateState("checking");
    try {
      const info = await tauriInvoke<UpdateInfo>("check_for_update");
      setUpdateInfo(info);
      setUpdateState(info.available ? "available" : "upToDate");
    } catch {
      setUpdateState("error");
    }
  };

  const installUpdate = async () => {
    if (!IS_TAURI) return;
    setUpdateState("installing");
    try {
      await tauriInvoke("install_update");
      toast.success("Actualización instalada. Reinicia la app para aplicarla.");
    } catch (e: any) {
      toast.error("Error al instalar: " + e);
      setUpdateState("available");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-3 pt-4"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Info className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Velaris</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Companion app para League of Legends · v{appVersion}
          </p>
          <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/20">
            ALPHA
          </span>
        </div>
      </motion.div>

      {/* Disclaimer */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-xl border border-border/50 bg-secondary/30 p-4 text-sm text-muted-foreground leading-relaxed"
      >
        Velaris isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties.{" "}
        <span className="font-medium text-foreground">League of Legends and all related assets are property of Riot Games, Inc.</span>
      </motion.div>

      {/* APIs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col gap-3"
      >
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          APIs que utiliza esta app
        </h2>
        <div className="flex flex-col gap-2">
          {APIS.map((api) => (
            <div
              key={api.name}
              className="flex items-start gap-3 rounded-xl border border-border/40 bg-secondary/20 p-3.5"
            >
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", api.bg)}>
                <api.icon className={cn("w-4 h-4", api.color)} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground">{api.name}</span>
                <span className="text-xs text-muted-foreground">{api.desc}</span>
                <span className={cn("text-[11px] font-medium mt-0.5", api.color)}>{api.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Update checker */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-xl border border-border/50 bg-secondary/20 p-4 flex items-center justify-between gap-4"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground">{t("about.installedVersion")}</span>
          <span className="text-xs text-muted-foreground">
            {updateState === "upToDate" && t("about.upToDate")}
            {updateState === "available" && updateInfo?.version && t("about.updateAvailable").replace("{version}", updateInfo.version)}
            {updateState === "error" && t("about.updateError")}
            {(updateState === "idle" || updateState === "checking" || updateState === "installing") && `v${appVersion}`}
          </span>
          {updateState === "available" && updateInfo?.notes && (
            <span className="text-[11px] text-muted-foreground/70 mt-1 line-clamp-2">{updateInfo.notes}</span>
          )}
        </div>

        {updateState === "idle" && (
          <button
            onClick={checkForUpdate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors border border-primary/20 whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Buscar actualizaciones
          </button>
        )}
        {updateState === "checking" && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-muted-foreground text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Comprobando…
          </div>
        )}
        {updateState === "upToDate" && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Al día
          </div>
        )}
        {updateState === "available" && (
          <button
            onClick={installUpdate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-semibold transition-colors border border-emerald-500/20 whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Instalar
          </button>
        )}
        {updateState === "installing" && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-emerald-400 text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Instalando…
          </div>
        )}
        {updateState === "error" && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-rose-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5" />
            Error
          </div>
        )}
      </motion.div>

      {/* Links */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-wrap gap-2"
      >
        <button
          onClick={() => navigate("/privacy")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 hover:bg-secondary/50 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Shield className="w-3.5 h-3.5" />
          {t("about.privacyPolicy")}
        </button>
        <button
          onClick={() => navigate("/terms")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 hover:bg-secondary/50 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {t("about.terms")}
        </button>
        <a
          href="https://developer.riotgames.com/policies/general"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 hover:bg-secondary/50 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {t("about.riotPolicies")}
        </a>
      </motion.div>
    </div>
  );
}

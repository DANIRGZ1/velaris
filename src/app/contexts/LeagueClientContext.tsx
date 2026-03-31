import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { useNavigate, useLocation } from "react-router";
import {
  isLiveGameRunning,
  getLiveGameData,
  getMatchHistory,
  getSummonerInfo,
  loadSettings,
  clearMatchCache,
} from "../services/dataService";
import { notifyGameResult } from "../services/notificationService";
import { getLPHistory, recordLPSnapshot } from "../services/lpTracker";
import { toast } from "sonner";
import { IS_TAURI, tauriInvoke, tauriListen } from "../helpers/tauriWindow";

export type ClientState =
  | "CONNECTING"
  | "DISCONNECTED"
  | "LOBBY"
  | "MATCHMAKING"
  | "READY_CHECK"
  | "CHAMP_SELECT"
  | "IN_GAME"
  | "END_OF_GAME";

interface LeagueClientContextType {
  clientState: ClientState;
  summonerName: string;
}

const LeagueClientContext = createContext<
  LeagueClientContextType | undefined
>(undefined);

// True when this JS context is running inside the overlay window.
// In that case, window management is handled by Rust — React Router navigation
// would just replace the overlay content with the main app UI.
const IS_OVERLAY_WINDOW = window.location.pathname === "/overlay";

export function LeagueClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [clientState, setClientState] =
    useState<ClientState>("CONNECTING");
  const [summonerName, setSummonerName] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const prevState = useRef<ClientState>("CONNECTING");
  // Ref so the stable polling interval always reads the latest state
  const clientStateRef = useRef<ClientState>("CONNECTING");
  clientStateRef.current = clientState;
  // Track the post-game timeout so it can be cancelled on unmount
  const gameEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Game context toasts on state transitions ──────────────────────────
  useEffect(() => {
    const prev = prevState.current;
    prevState.current = clientState;

    // Entering game: toast with game mode
    if (clientState === "IN_GAME" && prev !== "IN_GAME") {
      // Try to get game data for the toast
      getLiveGameData()
        .then((data) => {
          const mode = data?.gameData?.gameMode || "CLASSIC";
          const map =
            data?.gameData?.mapName === "Map11"
              ? "Summoner's Rift"
              : data?.gameData?.mapName || "Unknown Map";
          const modeLabel =
            mode === "CLASSIC"
              ? "Ranked Solo/Duo"
              : mode === "ARAM"
                ? "ARAM"
                : mode;
          toast.info("Game Started", {
            description: `${modeLabel} on ${map}`,
            duration: 5000,
          });
        })
        .catch(() => {
          toast.info("Game Started", {
            description: "Overlay activating...",
            duration: 4000,
          });
        });
    }

    // Game ended: clear match cache so fresh data loads on /post-game
    if (prev === "IN_GAME" && clientState !== "IN_GAME") {
      clearMatchCache();
      // Snapshot LP before fetching new rank (to compute delta)
      const prevHistory = getLPHistory();
      const prevTotalLP = prevHistory.length > 0 ? prevHistory[prevHistory.length - 1].totalLP : null;

      // Brief delay to let match history update
      if (gameEndTimeoutRef.current) clearTimeout(gameEndTimeoutRef.current);
      gameEndTimeoutRef.current = setTimeout(() => {
        Promise.all([getMatchHistory(), getSummonerInfo()])
          .then(([matches, summoner]) => {
            // Record new LP snapshot with game result
            let lpDelta: number | null = null;
            const sortedForLP = [...matches].sort((a, b) => b.gameCreation - a.gameCreation);
            if (summoner?.rank && summoner.lp !== undefined) {
              const latestForLP = sortedForLP[0];
              const won = latestForLP
                ? latestForLP.participants[latestForLP.playerParticipantIndex]?.win
                : undefined;
              const snap = recordLPSnapshot(
                summoner.rank,
                summoner.division ?? "I",
                summoner.lp,
                summoner.wins ?? 0,
                summoner.losses ?? 0,
                won ? "win" : "loss",
              );
              if (snap && prevTotalLP !== null) {
                lpDelta = snap.totalLP - prevTotalLP;
              }
            }

            if (matches && matches.length > 0) {
              const latest = [...matches].sort(
                (a, b) => b.gameCreation - a.gameCreation,
              )[0];
              const player = latest.participants[latest.playerParticipantIndex];
              const won = player.win;
              const kda = `${player.kills}/${player.deaths}/${player.assists}`;
              const champ = player.championName;
              const lpStr = lpDelta !== null
                ? ` · ${lpDelta >= 0 ? "+" : ""}${lpDelta} LP`
                : "";

              if (won) {
                toast.success(`Victory — ${champ}`, {
                  description: `${kda} KDA${lpStr}`,
                  duration: 6000,
                });
              } else {
                toast.error(`Defeat — ${champ}`, {
                  description: `${kda} KDA${lpStr}`,
                  duration: 6000,
                });
              }
              notifyGameResult(won, champ, kda);
            }
          })
          .catch(() => {});
      }, 2000);
    }

    // Entering champ select
    if (
      clientState === "CHAMP_SELECT" &&
      prev !== "CHAMP_SELECT"
    ) {
      toast("Champion Select", {
        description: "Draft phase started",
        duration: 4000,
      });
    }

    return () => {
      if (gameEndTimeoutRef.current) clearTimeout(gameEndTimeoutRef.current);
    };
  }, [clientState]);

  // ─── Ready Check — user-prompted accept (not automatic) ──────────────────
  // Riot policy prohibits fully automated queue acceptance (botting/scripting).
  // We show a toast with an explicit Accept button the user must click.
  useEffect(() => {
    if (clientState !== "READY_CHECK") return;
    if (!IS_TAURI) return;

    const settings = loadSettings();
    if (!settings.autoAccept) return;

    toast("¡Partida encontrada!", {
      description: "Haz clic en Aceptar para entrar.",
      duration: 25000,
      action: {
        label: "Aceptar",
        onClick: () => {
          tauriInvoke("accept_ready_check")
            .then(() => toast.success("Partida aceptada"))
            .catch(() => toast.error("La partida ya expiró"));
        },
      },
    });
  }, [clientState]);

  // Auto-navigation based on client state.
  // Skip entirely in the overlay window — Rust controls which window is visible;
  // navigating here would replace the overlay widgets with the main app UI.
  useEffect(() => {
    if (IS_OVERLAY_WINDOW) return;
    if (
      clientState === "CHAMP_SELECT" &&
      location.pathname !== "/champ-select"
    ) {
      navigate("/champ-select");
    } else if (
      clientState !== "IN_GAME" &&
      clientState !== "CHAMP_SELECT" &&
      location.pathname === "/overlay"
    ) {
      // Game ended or phase changed — exit overlay back to dashboard (or post-game)
      navigate(
        clientState === "END_OF_GAME"
          ? "/post-game"
          : "/dashboard",
      );
    }
  }, [clientState, navigate, location.pathname]);

  // Fetch summoner name from LCU on connect
  useEffect(() => {
    if (
      !IS_TAURI ||
      clientState === "DISCONNECTED" ||
      clientState === "CONNECTING"
    )
      return;

    const fetchSummonerName = async () => {
      try {
        // Try get_current_summoner (LCU /lol-summoner/v1/current-summoner)
        const raw = await tauriInvoke<Record<string, unknown>>("get_current_summoner");
        if (raw) {
          const name = (raw.gameName || raw.displayName || raw.internalName || "") as string;
          if (name) {
            setSummonerName(name);
            return;
          }
        }
      } catch {
        // LCU command unavailable
      }

      try {
        const info = await tauriInvoke<Record<string, unknown>>("get_summoner_info");
        if (info?.name) {
          setSummonerName(info.name as string);
        }
      } catch {
        // Command not available
      }
    };

    fetchSummonerName();
  }, [clientState]);

  useEffect(() => {
    if (IS_TAURI) {
      // Listen to real LCU phase change events from the Rust backend
      let unlisten: (() => void) | null = null;
      tauriListen("lcu-phase-changed", (event) => {
        const phase = event.payload as ClientState;
        console.log("[Velaris] LCU phase changed:", phase);
        setClientState(phase);
      })
        .then((fn) => { unlisten = fn; })
        .catch((err) => {
          console.warn("[Velaris] Failed to listen to lcu-phase-changed:", err);
          setClientState("LOBBY");
        });

      return () => { if (unlisten) unlisten(); };
    } else {
      // Web preview: simulate a connection after a short delay
      const timer = setTimeout(() => {
        setClientState((prev) => prev === "CONNECTING" ? "LOBBY" : prev);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Poll Live Client API to detect real games — web preview only.
  // In Tauri, the Rust backend (watch_client_state) already handles game-start and
  // game-end detection via both the LCU gameflow phase AND the Live Client API fallback.
  // Running a second poll here in Tauri mode creates a race condition: after a game ends
  // the LCU correctly emits END_OF_GAME/LOBBY, but this poll can still see port 2999
  // responding (game process shutting down) and flip the state BACK to IN_GAME.
  const wasInGame = useRef(false);
  useEffect(() => {
    if (IS_TAURI) return; // Rust owns game-state transitions; skip redundant poll

    let active = true;
    const poll = async () => {
      if (!active) return;
      const running = await isLiveGameRunning();
      if (!active) return;
      const state = clientStateRef.current;
      if (running && state !== "IN_GAME") {
        wasInGame.current = true;
        setClientState("IN_GAME");
      } else if (!running && wasInGame.current && state === "IN_GAME") {
        wasInGame.current = false;
        setClientState("END_OF_GAME");
      }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LeagueClientContext.Provider
      value={{ clientState, summonerName }}
    >
      {children}
    </LeagueClientContext.Provider>
  );
}

export function useLeagueClient() {
  const context = useContext(LeagueClientContext);
  if (context === undefined) {
    throw new Error(
      "useLeagueClient must be used within a LeagueClientProvider",
    );
  }
  return context;
}
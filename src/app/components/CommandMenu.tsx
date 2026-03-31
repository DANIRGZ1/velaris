import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { 
  CommandDialog, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList, 
  CommandSeparator,
  CommandShortcut
} from "./ui/command";
import {
  User,
  Settings,
  LayoutTemplate,
  Target,
  Activity,
  Users,
  Search,
  StickyNote,
  Trophy,
  Swords,
  CalendarDays,
  BotMessageSquare,
  BarChart3,
} from "lucide-react";

import { useLanguage } from "../contexts/LanguageContext";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      // "/" to open when not typing in an input
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-muted-foreground bg-secondary/50 hover:bg-secondary rounded-lg border border-border/50 transition-colors group cursor-pointer focus:outline-none"
      >
        <Search className="w-[14px] h-[14px] opacity-70" />
        <span className="flex-1 text-left">{t("cmd.quickSearch")}</span>
        <div className="flex items-center gap-1">
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            /
          </kbd>
        </div>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t("cmd.quickSearch")} />
        <CommandList>
          <CommandEmpty>{t("cmd.noResults")}</CommandEmpty>
          
          <CommandGroup heading={t("nav.navigation")}>
            <CommandItem onSelect={() => runCommand(() => navigate("/dashboard"))}>
              <BarChart3 className="mr-2 h-4 w-4" />
              <span>{t("cmd.dashboard")}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/matches"))}>
              <Activity className="mr-2 h-4 w-4" />
              <span>{t("cmd.activityLog")}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/champion-pool"))}>
              <Users className="mr-2 h-4 w-4" />
              <span>{t("cmd.championPool")}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/matchups"))}>
              <Swords className="mr-2 h-4 w-4" />
              <span>{t("cmd.matchups")}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/calendar"))}>
              <CalendarDays className="mr-2 h-4 w-4" />
              <span>{t("cmd.calendar")}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/learning"))}>
              <Target className="mr-2 h-4 w-4" />
              <span>{t("cmd.learningPath")}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/goals"))}>
              <Trophy className="mr-2 h-4 w-4" />
              <span>{t("cmd.goals")}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/notes"))}>
              <StickyNote className="mr-2 h-4 w-4" />
              <span>{t("cmd.notes")}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/coach"))}>
              <BotMessageSquare className="mr-2 h-4 w-4" />
              <span>{t("cmd.coach")}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/champ-select"))}>
              <LayoutTemplate className="mr-2 h-4 w-4" />
              <span>{t("cmd.draftAnalysis")}</span>
            </CommandItem>
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading={t("cmd.settings")}>
            <CommandItem onSelect={() => runCommand(() => navigate("/profile"))}>
              <User className="mr-2 h-4 w-4" />
              <span>{t("cmd.playerProfile")}</span>
              <CommandShortcut>⇧P</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/settings"))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>{t("cmd.settings")}</span>
              <CommandShortcut>⌘,</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
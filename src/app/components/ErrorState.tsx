import { AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "./ui/utils";

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Full-page error state with an optional retry button.
 * Used as a page-level fallback when data fails to load.
 */
export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn("w-full flex flex-col items-center justify-center h-[60vh] gap-4", className)}>
      <AlertCircle className="w-6 h-6 text-destructive" />
      <span className="text-sm text-muted-foreground text-center max-w-xs">{error}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary border border-border/50 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Reintentar
        </button>
      )}
    </div>
  );
}

/**
 * MarkdownPreview — Velaris
 *
 * Minimal markdown renderer using regex. Supports:
 * - **bold**, *italic*, `inline code`
 * - # H1, ## H2, ### H3
 * - - list items
 * - Line breaks
 */

import { cn } from "./ui/utils";

function renderInline(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  // Process bold, italic, inline code
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      // bold
      parts.push(<strong key={key++} className="font-semibold text-foreground">{match[2]}</strong>);
    } else if (match[3]) {
      // italic
      parts.push(<em key={key++} className="italic">{match[4]}</em>);
    } else if (match[5]) {
      // inline code
      parts.push(
        <code key={key++} className="px-1 py-0.5 rounded bg-secondary text-primary text-[0.9em] font-mono">
          {match[6]}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [text];
}

export function MarkdownPreview({ content, className }: { content: string; className?: string }) {
  const lines = content.split("\n");

  return (
    <div className={cn("text-[12px] text-muted-foreground/80 leading-relaxed", className)}>
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // Headers
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={i} className="text-[13px] font-semibold text-foreground mt-2 mb-1">
              {renderInline(trimmed.slice(4))}
            </h3>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={i} className="text-[14px] font-semibold text-foreground mt-2 mb-1">
              {renderInline(trimmed.slice(3))}
            </h2>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h1 key={i} className="text-[15px] font-semibold text-foreground mt-2 mb-1">
              {renderInline(trimmed.slice(2))}
            </h1>
          );
        }

        // List items
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-muted-foreground/50 select-none">&bull;</span>
              <span>{renderInline(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
        if (numMatch) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-muted-foreground/50 select-none min-w-[16px] text-right">{numMatch[1]}.</span>
              <span>{renderInline(numMatch[2])}</span>
            </div>
          );
        }

        // Empty line
        if (!trimmed) {
          return <div key={i} className="h-2" />;
        }

        // Regular text
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

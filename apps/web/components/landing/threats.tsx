import {
  Archive,
  Bomb,
  Bot,
  FileKey2,
  MessageSquareWarning,
  Puzzle,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";
import { Corners } from "./motion";

// What trips the vault: the attacks, and the real decoys and bait the repo plants.
const ITEMS: [LucideIcon, string, boolean?][] = [
  [FileKey2, "Stolen .env"],
  [Puzzle, "Malicious skill"],
  [MessageSquareWarning, "Prompt injection"],
  [ReceiptText, "Poisoned invoice"],
  [Bomb, "raise_spending_limit()", true],
  [Archive, "Leaked wallet backup"],
  [Bot, "Jailbroken agent"],
  [Bomb, "export_wallet_backup()", true],
];

export function Threats() {
  return (
    <section
      aria-labelledby="threats-label"
      className="relative flex items-stretch border-t bg-card"
    >
      <Corners />
      <div
        id="threats-label"
        className="flex flex-none items-center border-r px-5 text-xs font-medium whitespace-nowrap text-muted-foreground sm:px-8"
      >
        Trips on
      </div>
      <div className="marquee mask-fade-x min-w-0 flex-1 overflow-hidden py-3.5">
        <ul className="marquee-track flex w-max gap-2.5" aria-label="Attacks Telltale catches">
          {[...ITEMS, ...ITEMS].map(([Icon, label, code], i) => (
            <li
              key={i}
              aria-hidden={i >= ITEMS.length}
              className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-[13px] whitespace-nowrap"
            >
              <Icon className="size-3.5 text-muted-foreground" />
              <span className={code ? "font-mono text-xs" : undefined}>{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

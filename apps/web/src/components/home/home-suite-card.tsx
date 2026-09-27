import { cn } from "@anpord/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { HomePanel } from "@/components/home/home-panel";
import { Sparkline } from "@/components/home/sparkline";
import { VerdictSquares } from "@/components/home/verdict-squares";
import { VERDICT_FILL } from "@/components/home/verdict-tone";
import type { HomeSuiteCard as Card } from "@/lib/evals/home-view";

export function HomeSuiteCard({ card }: { readonly card: Card }) {
  const { tally } = card;

  return (
    <HomePanel
      aside={`${tally.passing} of ${tally.total}`}
      title={card.suite.name}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "font-semibold text-2xl tabular-nums leading-[30px] tracking-tight",
            tally.failing === 0 && "text-success"
          )}
        >
          {tally.passRate === null ? "None" : `${tally.passRate}%`}
        </span>
        <Sparkline
          className={
            tally.failing > 1 ? "text-destructive" : "text-muted-foreground"
          }
          height={26}
          rates={card.trend}
          width={90}
        />
      </div>
      <VerdictSquares cells={card.cells} />
      {card.listed.length === 0 ? (
        <p className="text-[13px] text-success">All passing</p>
      ) : (
        <ul className="flex flex-col">
          {card.listed.map((entry) => (
            <li className="border-border border-t" key={entry.key}>
              <Link
                className="flex h-[26px] items-center gap-2 text-[13px] transition-colors duration-150 hover:text-foreground"
                params={{ caseId: entry.caseId }}
                to="/evals/cases/$caseId"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    VERDICT_FILL[entry.verdict]
                  )}
                />
                <span className="min-w-0 flex-1 truncate">
                  {entry.caseName}
                </span>
                <span className="max-w-[55%] truncate text-muted-foreground/70 text-xs">
                  {entry.detail}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </HomePanel>
  );
}

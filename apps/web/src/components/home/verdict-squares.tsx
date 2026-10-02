import { cn } from "@sphynx/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { VERDICT_FILL, VERDICT_LABEL } from "@/components/home/verdict-tone";
import type { HomeCell } from "@/lib/evals/home-view";

export function VerdictSquares({
  cells,
  small = false,
}: {
  readonly cells: readonly HomeCell[];
  readonly small?: boolean;
}) {
  return (
    <ul className="flex flex-wrap gap-[3px]">
      {cells.map((cell) => (
        <li className="flex" key={cell.key}>
          <Link
            aria-label={`${cell.caseName} on ${cell.variant}, ${VERDICT_LABEL[cell.verdict]}`}
            className={cn(
              "skeleton:skeleton-paint rounded-[3px] outline-offset-1 transition-opacity duration-150 hover:opacity-70",
              small ? "size-2.5" : "size-[11px]",
              VERDICT_FILL[cell.verdict],
              cell.dim && "opacity-25"
            )}
            params={{ caseId: cell.caseId }}
            title={`${cell.caseName} · ${cell.variant}`}
            to="/evals/cases/$caseId"
          />
        </li>
      ))}
    </ul>
  );
}

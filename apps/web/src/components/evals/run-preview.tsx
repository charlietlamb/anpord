import type { EvalProvider } from "@anpord/schema/domain/evals";
import { cn } from "@anpord/ui/lib/utils";
import { WarningIcon } from "@phosphor-icons/react";
import {
  modelPresentation,
  providerPresentation,
} from "@/lib/evals/variant-presentation";

/**
 * Everything this run is about to do, before it does any of it.
 *
 * Cost here is multiplicative in a way it is not in an ordinary form: a third
 * model and a second sandbox turn nine sandboxes into twenty-four without
 * anything on screen changing size. The count is next to the button that
 * spends it, because that is the last moment it can be reconsidered.
 *
 * Ungated cases are named rather than counted. A case that runs and cannot
 * pass is not a smaller version of a case that can; reading its verdict as
 * evidence is the mistake the whole void gate exists to prevent.
 */
export function RunPreview({
  cases,
  className,
  models,
  providers,
  trials,
  ungated,
}: {
  readonly cases: readonly { readonly name: string }[];
  readonly className?: string;
  readonly models: readonly string[];
  readonly providers: readonly EvalProvider[];
  readonly trials: number;
  readonly ungated: readonly string[];
}) {
  const columns = models.length * providers.length;
  const cells = cases.length * columns;
  const runs = cells * trials;

  if (cells === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
        <span className="font-medium text-sm tabular-nums">{runs} runs</span>
        <span className="text-muted-foreground">
          {cases.length} {cases.length === 1 ? "case" : "cases"} × {columns}{" "}
          {columns === 1 ? "variant" : "variants"} × {trials}{" "}
          {trials === 1 ? "trial" : "trials"}
        </span>
      </div>

      <ul className="flex flex-wrap gap-1">
        {providers.flatMap((provider) =>
          models.map((model) => {
            const modelOwn = modelPresentation(model);
            const providerOwn = providerPresentation(provider);

            return (
              <li
                className="inline-flex items-center gap-1.5 rounded-md border border-border-faint px-2 py-1 text-xs"
                key={`${provider}-${model}`}
              >
                <modelOwn.Icon className="size-3 shrink-0" />
                {modelOwn.label}
                <span className="text-muted-foreground">on</span>
                <providerOwn.Icon className="size-3 shrink-0" />
                {providerOwn.label}
              </li>
            );
          })
        )}
      </ul>

      {ungated.length === 0 ? null : (
        <p className="flex items-start gap-1.5 text-warning text-xs">
          <WarningIcon className="mt-0.5 size-3.5 shrink-0" />
          <span className="text-pretty">
            {ungated.join(", ")} {ungated.length === 1 ? "has" : "have"} no
            verify script, so {ungated.length === 1 ? "it runs" : "they run"}{" "}
            but cannot pass.
          </span>
        </p>
      )}
    </div>
  );
}

import type { EvalAgent, EvalHarness } from "@anpord/schema/domain/evals";
import { SearchableMultiSelect } from "@anpord/ui/components/ui/searchable-multi-select";
import { useQueries } from "@tanstack/react-query";
import { parseAsString, useQueryState } from "nuqs";
import { useState } from "react";
import { evalQueries } from "@/lib/evals/eval-queries";
import { HARNESS_OPTIONS } from "@/lib/evals/variant-options";
import {
  harnessPresentation,
  modelPresentation,
} from "@/lib/evals/variant-presentation";

const SEARCH_THROTTLE_MS = 250;
const keyOf = ({ harness, model }: EvalAgent) => `${harness}\0${model}`;

export function AgentField({
  onChange,
  value,
}: {
  readonly onChange: (next: EvalAgent[]) => void;
  readonly value: readonly EvalAgent[];
}) {
  const [harnesses, setHarnesses] = useState<readonly EvalHarness[]>(() => [
    ...new Set(value.map((agent) => agent.harness)),
  ]);
  const [search, setSearch] = useQueryState(
    "model",
    parseAsString
      .withDefault("")
      .withOptions({ clearOnDefault: true, throttleMs: SEARCH_THROTTLE_MS })
  );

  const catalogues = useQueries({
    queries: harnesses.map((harness) => evalQueries.models(harness, search)),
  });

  const loading = catalogues.some((query) => query.isPending);

  const found = catalogues.flatMap(
    (query, index) =>
      query.data?.models.map((model) => ({
        ...model,
        harness: harnesses[index] as EvalHarness,
      })) ?? []
  );

  const shown = [
    ...found,
    ...value.flatMap((agent) =>
      found.some(
        (model) => model.harness === agent.harness && model.id === agent.model
      )
        ? []
        : [
            {
              displayName: agent.model,
              harness: agent.harness,
              id: agent.model,
              summary: null,
              vendor: null,
            },
          ]
    ),
  ];

  const total = catalogues.reduce(
    (count, query) => count + (query.data?.total ?? 0),
    0
  );

  const selected = value.map(keyOf);
  const options = shown.map((model) => ({
    description: `${harnessPresentation(model.harness).label} · ${model.summary ?? model.id}`,
    label: model.displayName,
    value: keyOf({ harness: model.harness, model: model.id }),
  }));

  return (
    <>
      <div className="grid gap-1.5">
        <span className="font-medium text-xs">Harnesses</span>
        <SearchableMultiSelect
          emptyLabel="Choose a harness"
          label="Harnesses"
          onChange={(next) => {
            setHarnesses(next);
            onChange(value.filter((agent) => next.includes(agent.harness)));
          }}
          options={HARNESS_OPTIONS}
          renderOption={(option) => {
            const { Icon } = harnessPresentation(option.value);
            return <Icon className="size-3.5 shrink-0" />;
          }}
          searchPlaceholder="Search harnesses…"
          value={harnesses}
        />
      </div>
      <div className="grid gap-1.5">
        <span className="font-medium text-xs">Agents</span>
        <SearchableMultiSelect
          emptyLabel={loading ? "Loading agents…" : "Choose an agent"}
          label="Agents"
          onChange={(next) =>
            onChange(
              next.map((key) => {
                const split = key.indexOf("\0");
                return {
                  harness: key.slice(0, split) as EvalHarness,
                  model: key.slice(split + 1),
                };
              })
            )
          }
          options={options}
          renderOption={(option) => {
            const split = option.value.indexOf("\0");
            const { Icon } = modelPresentation(option.value.slice(split + 1));

            return <Icon className="size-3.5 shrink-0" />;
          }}
          search={{ onChange: setSearch, value: search }}
          searchPlaceholder="Search agents…"
          truncatedBy={total - found.length}
          value={selected}
        />
      </div>
    </>
  );
}

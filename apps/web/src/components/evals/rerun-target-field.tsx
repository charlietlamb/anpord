import { DEFAULT_SANDBOX } from "@anpord/schema/domain/eval-definition";
import type { RerunTarget } from "@anpord/schema/domain/eval-rerun";
import { EvalHarness } from "@anpord/schema/domain/eval-trial";
import { Button } from "@anpord/ui/components/button";
import { VariantName } from "@anpord/ui/components/evals/variant-name";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@anpord/ui/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@anpord/ui/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@anpord/ui/components/ui/select";
import { CaretDownIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { evalQueries } from "@/lib/evals/eval-queries";

const AS_BEFORE = "asBefore";

function ModelField({
  harness,
  model,
  onSelect,
}: {
  readonly harness: EvalHarness;
  readonly model: string;
  readonly onSelect: (model: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data } = useQuery(evalQueries.models(harness, query.trim() || null));

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            aria-label="Model"
            className="min-w-0 max-w-56 justify-between"
            size="sm"
            variant="outline"
          />
        }
      >
        <span className="truncate">
          {model === "" ? "Choose a model" : model}
        </span>
        <CaretDownIcon className="text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent align="start" className="w-72 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            onValueChange={setQuery}
            placeholder="Find a model…"
            value={query}
          />
          <CommandList>
            <CommandEmpty>No models match.</CommandEmpty>
            <CommandGroup>
              {(data?.models ?? []).map((entry) => (
                <CommandItem
                  data-checked={entry.id === model}
                  key={entry.id}
                  onSelect={() => {
                    onSelect(entry.id);
                    setOpen(false);
                  }}
                  value={entry.id}
                >
                  <span className="truncate">{entry.displayName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function RerunTargetField({
  onChange,
  target,
}: {
  readonly onChange: (target: RerunTarget) => void;
  readonly target: RerunTarget;
}) {
  const choose = (value: string | null) => {
    if (value === null) {
      return;
    }

    onChange(
      value === AS_BEFORE
        ? { kind: "asBefore" }
        : {
            harness: value as EvalHarness,
            kind: "onVariant",
            model: "",
            sandbox: DEFAULT_SANDBOX,
          }
    );
  };

  return (
    <>
      <Select
        onValueChange={choose}
        value={target.kind === AS_BEFORE ? AS_BEFORE : target.harness}
      >
        <SelectTrigger aria-label="Where to run" className="max-w-56" size="sm">
          <SelectValue>
            {target.kind === AS_BEFORE ? (
              "On the same variants"
            ) : (
              <VariantName harness={target.harness} model="" />
            )}
          </SelectValue>
        </SelectTrigger>

        <SelectContent align="start" className="w-64">
          <SelectItem className="pr-8" value={AS_BEFORE}>
            On the same variants
          </SelectItem>

          {EvalHarness.literals.map((harness) => (
            <SelectItem className="pr-8" key={harness} value={harness}>
              <VariantName harness={harness} model="" />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {target.kind === "onVariant" ? (
        <ModelField
          harness={target.harness}
          model={target.model}
          onSelect={(model) => onChange({ ...target, model })}
        />
      ) : null}
    </>
  );
}

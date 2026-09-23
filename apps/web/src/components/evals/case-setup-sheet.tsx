import type { EvalCaseSetup } from "@anpord/schema/domain/evals";
import { Button } from "@anpord/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@anpord/ui/components/ui/sheet";
import { SlidersHorizontalIcon } from "@phosphor-icons/react";
import { CaseSetup } from "@/components/evals/case-setup";

export function CaseSetupSheet({ setup }: { readonly setup: EvalCaseSetup }) {
  return (
    <Sheet>
      <SheetTrigger render={<Button size="sm" variant="outline" />}>
        <SlidersHorizontalIcon className="size-3.5" />
        Setup
      </SheetTrigger>

      <SheetContent>
        <SheetHeader className="gap-1 border-border border-b p-4 pr-12">
          <SheetTitle>Setup</SheetTitle>
          <SheetDescription>
            How the newest run of this case was set up and judged.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <CaseSetup bare setup={setup} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

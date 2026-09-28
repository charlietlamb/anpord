import { Button } from "@anpord/ui/components/button";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react";
import { useState } from "react";
import {
  RerunDialog,
  type RerunSubject,
} from "@/components/evals/rerun-dialog";

export function RerunButton({ subject }: { readonly subject: RerunSubject }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant={subject.kind === "fixed" ? "default" : "outline"}
      >
        <ArrowsClockwiseIcon />
        Run again
      </Button>

      {open ? (
        <RerunDialog onClose={() => setOpen(false)} open subject={subject} />
      ) : null}
    </>
  );
}

import { Button } from "@anpord/ui/components/button";
import { ShortcutButton } from "@anpord/ui/components/ui/shortcut-button";
import { PlusIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import {
  type ButtonOption,
  OnSurface,
  SubmitButton,
} from "@/components/dev/submit-button-preview";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const Route = createFileRoute("/dev/buttons")({
  component: ButtonOptions,
});

const CAP = "border-white/20 bg-white/16 text-white/80";

const OPTIONS: ButtonOption[] = [
  {
    title: "1 · Current",
    note: "Full-strength primary, light caps",
    shell: "bg-primary text-primary-foreground",
    caps: "border-current/15 bg-current/10 text-current/70",
  },
  {
    title: "2 · Primary, darker caps",
    note: "Caps read against the fill",
    shell: "bg-primary text-primary-foreground",
    caps: "border-black/10 bg-black/10 text-current/80",
  },
  {
    title: "3 · Deepened primary",
    note: "Mixed toward black so it sits back",
    shell: "bg-[color-mix(in_oklab,var(--primary),black_22%)] text-white",
    caps: "border-white/15 bg-white/15 text-white/80",
  },
  {
    title: "4 · Foreground fill",
    note: "Neutral, maximum contrast, no hue",
    shell: "bg-foreground text-background",
    caps: "border-current/15 bg-current/10 text-current/70",
  },
  {
    title: "5 · Subtle fill",
    note: "Muted with a hairline, reads as secondary",
    shell:
      "bg-muted text-foreground shadow-[inset_0_0_0_1px_oklch(0_0_0/8%)] dark:shadow-[inset_0_0_0_1px_oklch(1_0_0/10%)]",
    caps: "border-current/15 bg-current/10 text-current/60",
  },
  {
    title: "6 · Outline",
    note: "No fill until hover",
    shell:
      "text-foreground shadow-[inset_0_0_0_1px_oklch(0_0_0/12%)] hover:bg-muted dark:shadow-[inset_0_0_0_1px_oklch(1_0_0/14%)]",
    caps: "border-current/15 bg-current/10 text-current/60",
  },
  {
    title: "7 · Primary + ring",
    note: "Ring ties it to the surface edge",
    shell:
      "bg-primary text-primary-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary),black_25%)]",
    caps: "border-black/10 bg-black/10 text-current/80",
  },
  {
    title: "8 · Primary tint",
    note: "Primary at low alpha, primary text",
    shell: "bg-primary/15 text-primary",
    caps: "border-current/20 bg-current/10 text-current/70",
  },
  {
    title: "9 · Gradient primary",
    note: "Top highlight, like the landing CTA",
    shell:
      "btn-primary-glow bg-primary text-primary-foreground shadow-[0_1px_2px_oklch(0_0_0/20%)]",
    caps: "border-black/10 bg-black/10 text-current/80",
  },
  {
    title: "10 · Deep neutral",
    note: "Near-black fill, hue only on hover",
    shell:
      "bg-[oklch(0.28_0.01_260)] text-white hover:bg-primary dark:bg-[oklch(0.32_0.01_260)]",
    caps: "border-white/15 bg-white/15 text-white/80",
  },
];

const RADII = ["rounded-md", "rounded-lg", "rounded-xl"];

const RINGS: ButtonOption[] = [
  {
    title: "none",
    note: "",
    shell: "bg-primary text-primary-foreground",
    caps: CAP,
  },
  {
    title: "inset top",
    note: "",
    shell:
      "bg-primary text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/22%),0_1px_2px_oklch(0_0_0/25%)]",
    caps: CAP,
  },
  {
    title: "hairline only",
    note: "",
    shell:
      "bg-primary text-primary-foreground shadow-[inset_0_0_0_1px_oklch(1_0_0/12%)]",
    caps: CAP,
  },
  {
    title: "outer dark",
    note: "",
    shell:
      "bg-primary text-primary-foreground shadow-[0_0_0_1px_oklch(0_0_0/40%)]",
    caps: CAP,
  },
  {
    title: "bevel",
    note: "",
    shell:
      "bg-primary text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/22%),inset_0_-1px_0_oklch(0_0_0/22%),0_1px_2px_oklch(0_0_0/25%)]",
    caps: CAP,
  },
  {
    title: "hairline + bevel + lift",
    note: "chosen",
    shell:
      "bg-primary text-primary-foreground shadow-[inset_0_0_0_1px_oklch(1_0_0/10%),inset_0_1px_0_oklch(1_0_0/22%),0_1px_3px_oklch(0_0_0/18%)] dark:shadow-[inset_0_0_0_1px_oklch(1_0_0/8%),inset_0_1px_0_oklch(1_0_0/24%),0_1px_3px_oklch(0_0_0/30%)]",
    caps: CAP,
  },
];

function ButtonOptions() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto w-full max-w-5xl px-6 py-12">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl tracking-tight">
              Submit button
            </h1>
            <p className="text-muted-foreground text-sm">
              Ten treatments on the composer surface. Toggle the theme.
            </p>
          </div>
          <ThemeToggle />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {OPTIONS.map((option) => (
            <div key={option.title}>
              <p className="font-medium text-sm">{option.title}</p>
              <p className="mb-2 text-muted-foreground text-xs">
                {option.note}
              </p>
              <OnSurface option={option} />
            </div>
          ))}
        </div>

        <h2 className="mt-14 mb-3 font-heading text-lg tracking-tight">
          Shared variants
        </h2>
        <div className="mb-10 flex flex-wrap items-center gap-3 rounded-[18px] bg-card p-5 shadow-[inset_0_0_0_1px_oklch(0_0_0/4%)] dark:shadow-[inset_0_0_0_1px_oklch(1_0_0/8%)]">
          <ShortcutButton metaShortcut="enter" size="sm">
            <PlusIcon size={15} />
            Create prompt
          </ShortcutButton>
          <Button size="sm">Default</Button>
          <Button size="sm" variant="outline">
            Outline
          </Button>
          <Button size="sm" variant="secondary">
            Secondary
          </Button>
          <Button size="sm" variant="ghost">
            Ghost
          </Button>
          <Button size="sm" variant="destructive">
            Destructive
          </Button>
        </div>

        <h2 className="mt-14 mb-3 font-heading text-lg tracking-tight">
          Edge treatments
        </h2>
        <div className="mb-10 grid gap-5 sm:grid-cols-3">
          {RINGS.map((ring) => (
            <div key={ring.title}>
              <p className="mb-2 text-muted-foreground text-xs">
                {ring.title}
                {ring.note ? ` — ${ring.note}` : ""}
              </p>
              <OnSurface option={ring} />
            </div>
          ))}
        </div>

        <h2 className="mt-14 mb-3 font-heading text-lg tracking-tight">
          Radius, on the leading candidate
        </h2>
        <div className="flex flex-wrap items-center gap-4 rounded-[18px] bg-card p-5 shadow-[inset_0_0_0_1px_oklch(0_0_0/4%)] dark:shadow-[inset_0_0_0_1px_oklch(1_0_0/8%)]">
          {RADII.map((radius) => (
            <div className="flex flex-col items-center gap-2" key={radius}>
              <SubmitButton
                caps={OPTIONS[2].caps}
                radius={radius}
                shell={OPTIONS[2].shell}
              />
              <span className="text-muted-foreground text-xs">{radius}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

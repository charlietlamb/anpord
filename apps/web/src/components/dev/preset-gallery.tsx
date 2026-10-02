import { cn } from "@sphynx/ui/lib/utils";
import { PresetFull } from "@/components/dev/preset-full";
import type { Preset, PresetKind } from "@/components/dev/preset-kind";
import { PresetThumb } from "@/components/dev/preset-thumb";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function PresetGallery<P extends Preset>({
  id,
  kind,
}: {
  readonly id: string | undefined;
  readonly kind: PresetKind<P>;
}) {
  const opened = kind.presets.find((preset) => preset.id === id);

  if (opened !== undefined) {
    return <PresetFull key={opened.id} kind={kind} preset={opened} />;
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div
        className={cn(
          "mx-auto flex w-full max-w-[1600px] flex-col",
          kind.sectionGap,
          "px-6 py-8"
        )}
      >
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl tracking-tight">
              {kind.title}
            </h1>
            <p className="text-muted-foreground text-sm">{kind.description}</p>
          </div>
          <ThemeToggle />
        </header>
        {kind.families.map((family) => (
          <section className="flex flex-col gap-4" key={family.name}>
            <div>
              <h2 className="font-heading text-lg tracking-tight">
                {family.name}
              </h2>
              <p className="text-muted-foreground text-sm">
                {family.description}
              </p>
            </div>
            <div className="grid gap-x-6 gap-y-8 md:grid-cols-2">
              {family.presets.map((preset) => (
                <PresetThumb
                  key={preset.id}
                  kind={kind}
                  number={kind.presets.indexOf(preset) + 1}
                  preset={preset}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

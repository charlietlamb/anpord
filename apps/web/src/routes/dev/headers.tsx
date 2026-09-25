import { HEADER_FAMILIES, HEADER_PRESETS } from "@anpord/ui/lib/header-presets";
import { createFileRoute } from "@tanstack/react-router";
import { HeaderFull } from "@/components/dev/header-full";
import { HeaderThumb } from "@/components/dev/header-thumb";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const Route = createFileRoute("/dev/headers")({
  component: HeadersPreview,
  validateSearch: (search): { id?: string } =>
    typeof search.id === "string" ? { id: search.id } : {},
  ssr: false,
});

function HeadersPreview() {
  const { id } = Route.useSearch();
  const opened = HEADER_PRESETS.find((preset) => preset.id === id);

  if (opened !== undefined) {
    return <HeaderFull key={opened.id} preset={opened} />;
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 px-6 py-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl tracking-tight">Headers</h1>
            <p className="text-muted-foreground text-sm">
              Each card is the landing page at your window size, cropped to the
              top. Open one for full size; arrow keys step through.
            </p>
          </div>
          <ThemeToggle />
        </header>

        {HEADER_FAMILIES.map((family) => (
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
                <HeaderThumb
                  key={preset.id}
                  number={HEADER_PRESETS.indexOf(preset) + 1}
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

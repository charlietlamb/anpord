import { PROMPTS_ENABLED } from "@anpord/schema/domain/features";
import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/prompts")({
  beforeLoad: () => {
    if (!PROMPTS_ENABLED) {
      throw notFound();
    }
  },
  component: PromptsLayout,
  staticData: { title: "Prompts" },
});

function PromptsLayout() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Outlet />
    </div>
  );
}

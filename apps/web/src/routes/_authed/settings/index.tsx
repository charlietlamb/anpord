import { createFileRoute } from "@tanstack/react-router";
import { GeneralSettings } from "@/components/settings/general-settings";

export const Route = createFileRoute("/_authed/settings/")({
  component: GeneralSettings,
});

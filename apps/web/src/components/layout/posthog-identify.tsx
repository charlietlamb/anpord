import { useIdentify } from "@/lib/analytics/use-identify";

export function PostHogIdentify() {
  useIdentify();
  return null;
}

import type { HeaderPreset } from "./header-presets";

export const FLOAT = "sticky z-50 w-full";

export const CURRENT_HEADER: HeaderPreset = {
  bar: "rounded-xl border-0 bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.08),0_12px_40px_-16px_rgb(0_0_0/0.18)] dark:bg-[#0b0d10] dark:shadow-[0_0_0_1px_#2a2f36,0_12px_40px_-16px_rgb(0_0_0/0.8)]",
  cta: "raised",
  description: "A cool blue-grey cast, closest to our own dark surfaces.",
  id: "current",
  inner: "h-14 gap-8 px-4",
  link: "rounded-md",
  name: "Current",
  nav: "left",
  offset: `${FLOAT} top-5 max-w-3xl px-6`,
  signIn: "vercel",
  source: "Linear",
};

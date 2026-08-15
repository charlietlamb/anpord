"use client";

import type { ReactNode } from "react";
import { Toaster } from "./sonner";
import { ThemeProvider } from "./theme-provider";
import { TooltipProvider } from "./tooltip";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <TooltipProvider delay={300}>{children}</TooltipProvider>
      <Toaster />
    </ThemeProvider>
  );
}

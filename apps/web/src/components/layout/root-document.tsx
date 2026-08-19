import { Providers } from "@anpord/ui/components/providers";
import { HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Analytics } from "@/components/layout/analytics";
import { dialogRegistry } from "@/lib/dialog/dialog-registry";
import { DialogProvider } from "@/lib/dialog/dialogs";

export function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      className="antialiased"
      data-surfaces="inverted"
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
      </head>
      <body>
        <Analytics>
          <Providers>
            <DialogProvider registry={dialogRegistry}>
              {children}
            </DialogProvider>
          </Providers>
        </Analytics>
        <Scripts />
      </body>
    </html>
  );
}

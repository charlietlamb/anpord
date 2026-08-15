import type { ReactNode } from "react";

interface PanelCardProps {
  children?: ReactNode;
  description: string;
  heading?: "h1" | "h2";
  title: string;
}

export function PanelCard({
  children,
  description,
  heading = "h2",
  title,
}: PanelCardProps) {
  const Heading = heading;
  return (
    <div className="w-full max-w-sm rounded-lg border bg-background p-8 text-left">
      <Heading className="font-heading text-xl tracking-tight">{title}</Heading>
      <p className="mt-2 text-muted-foreground text-sm">{description}</p>
      {children}
    </div>
  );
}

import { type MouseEvent, useState } from "react";

const AWAY = { x: -200, y: 0 };

export function HeaderGlow() {
  const [glow, setGlow] = useState(AWAY);

  const track = (event: MouseEvent<HTMLElement>) => {
    const box = event.currentTarget.getBoundingClientRect();

    setGlow({ x: event.clientX - box.left, y: event.clientY - box.top });
  };

  return (
    <span
      aria-hidden
      className="absolute inset-0 rounded-[inherit]"
      onMouseLeave={() => setGlow(AWAY)}
      onMouseMove={track}
      style={{
        background: `radial-gradient(200px circle at ${glow.x}px ${glow.y}px, color-mix(in oklch, var(--foreground) 10%, transparent), transparent 70%)`,
      }}
    />
  );
}

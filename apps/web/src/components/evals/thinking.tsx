import {
  Message,
  MessageContent,
} from "@anpord/ui/components/ai-elements/message";

const DELAYS = ["0ms", "160ms", "320ms"] as const;

const DOT =
  "size-1.5 rounded-full bg-current [animation:thinking-dot_1.2s_ease-in-out_infinite] motion-reduce:animate-none motion-reduce:opacity-60";

export function Thinking({ label }: { readonly label: string }) {
  return (
    <Message from="assistant">
      <MessageContent>
        <span className="flex items-center gap-2 text-muted-foreground text-sm">
          <span aria-hidden className="flex items-center gap-1">
            {DELAYS.map((delay) => (
              <span
                className={DOT}
                key={delay}
                style={{ animationDelay: delay }}
              />
            ))}
          </span>
          {label}
        </span>
      </MessageContent>
    </Message>
  );
}

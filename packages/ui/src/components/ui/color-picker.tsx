import { CheckIcon } from "@phosphor-icons/react";
import { Button } from "../button";
import {
  CHANNEL_COLORS,
  CHANNEL_SWATCHES,
  type ChannelColor,
} from "../../lib/channel-colors";
import { cn } from "../../lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

interface ColorPickerProps {
  readonly onChange: (color: ChannelColor) => void;
  readonly value: ChannelColor;
}

export function ColorPicker({ onChange, value }: ColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            aria-label={`Colour: ${value}`}
            className="size-9 shrink-0"
            size="icon"
            type="button"
            variant="outline"
          >
            <span
              className={cn("size-4 rounded-full", CHANNEL_SWATCHES[value])}
            />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto p-2">
        <div className="grid grid-cols-4 gap-1">
          {CHANNEL_COLORS.map((color) => (
            <button
              aria-label={color}
              aria-pressed={color === value}
              className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-accent"
              key={color}
              onClick={() => onChange(color)}
              type="button"
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full",
                  CHANNEL_SWATCHES[color]
                )}
              >
                {color === value ? (
                  <CheckIcon className="text-white" size={12} weight="bold" />
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

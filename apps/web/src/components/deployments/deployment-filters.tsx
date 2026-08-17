import { Button } from "@anpord/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@anpord/ui/components/dropdown-menu";
import { CaretDownIcon, XIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { channelQueries } from "@/lib/query/channel-queries";

interface DeploymentFiltersProps {
  readonly channel: string;
  readonly onChannelChange: (channel: string | null) => void;
  readonly onClearPrompt: () => void;
  readonly prompt: string;
}

export function DeploymentFilters({
  channel,
  onChannelChange,
  onClearPrompt,
  prompt,
}: DeploymentFiltersProps) {
  const channels = useQuery(channelQueries.list());

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button size="sm" variant="outline">
              {channel === "" ? "All channels" : channel}
              <CaretDownIcon size={14} />
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => onChannelChange(null)}>
            All channels
          </DropdownMenuItem>
          {(channels.data ?? []).map((option) => (
            <DropdownMenuItem
              key={option.name}
              onClick={() => onChannelChange(option.name)}
            >
              {option.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {prompt === "" ? null : (
        <Button onClick={onClearPrompt} size="sm" variant="outline">
          {prompt}
          <XIcon size={14} />
        </Button>
      )}
    </div>
  );
}

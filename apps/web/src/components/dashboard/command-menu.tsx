import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@anpord/ui/components/ui/command";
import { useShortcut } from "@anpord/ui/hooks/use-shortcut";
import {
  BuildingsIcon,
  MoonIcon,
  PlusIcon,
  SignOutIcon,
  SunIcon,
} from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useTheme } from "next-themes";
import { useState } from "react";
import { DASHBOARD_NAV } from "@/components/dashboard/dashboard-nav";
import { useDialog } from "@/lib/dialog/dialogs";
import { useSignOut } from "@/lib/use-sign-out";

const NAV_ITEMS = DASHBOARD_NAV.flatMap((section) =>
  section.items.filter((item) => !item.comingSoon)
);

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { open: openDialog } = useDialog();
  const { resolvedTheme, setTheme } = useTheme();
  const onSignOut = useSignOut();

  useShortcut("k", { meta: true, onTrigger: () => setOpen((prev) => !prev) });

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <CommandDialog onOpenChange={setOpen} open={open}>
      <Command>
        <CommandInput placeholder="Type a command or search…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {NAV_ITEMS.map((item) => (
              <CommandItem
                key={item.to + item.label}
                onSelect={() => run(() => navigate({ to: item.to }))}
              >
                <item.icon weight="fill" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => run(() => openDialog("createOrganization", {}))}
            >
              <BuildingsIcon weight="fill" />
              Create organization
            </CommandItem>
            <CommandItem
              onSelect={() => run(() => openDialog("inviteMember", {}))}
            >
              <PlusIcon weight="bold" />
              Invite member
            </CommandItem>
            <CommandItem
              onSelect={() =>
                run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))
              }
            >
              {resolvedTheme === "dark" ? (
                <SunIcon weight="fill" />
              ) : (
                <MoonIcon weight="fill" />
              )}
              Toggle theme
            </CommandItem>
            <CommandItem onSelect={() => run(onSignOut)}>
              <SignOutIcon weight="fill" />
              Sign out
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

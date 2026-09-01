import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@anpord/ui/components/ui/command";
import { useDebounced } from "@anpord/ui/hooks/use-debounced";
import { useShortcut } from "@anpord/ui/hooks/use-shortcut";
import {
  BuildingsIcon,
  MoonIcon,
  PlusIcon,
  SignOutIcon,
  SunIcon,
  UserSwitchIcon,
} from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useTheme } from "next-themes";
import { useCallback, useState } from "react";
import { DASHBOARD_NAV } from "@/components/dashboard/dashboard-nav";
import { ImpersonatePage } from "@/components/dashboard/impersonate-page";
import { useDialog } from "@/lib/dialog/dialogs";
import { useImpersonation } from "@/lib/use-impersonation";
import { useSignOut } from "@/lib/use-sign-out";

const NAV_ITEMS = DASHBOARD_NAV.flatMap((section) =>
  section.items.filter((item) => !item.comingSoon)
);

const SEARCH_SETTLE_MS = 200;

type Page = "main" | "impersonate";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<Page>("main");
  const [search, setSearch] = useState("");
  const settledSearch = useDebounced(search, SEARCH_SETTLE_MS);
  const navigate = useNavigate();
  const { open: openDialog } = useDialog();
  const { resolvedTheme, setTheme } = useTheme();
  const onSignOut = useSignOut();
  const impersonation = useImpersonation();

  const close = useCallback(() => {
    setOpen(false);
    setPage("main");
    setSearch("");
  }, []);

  const toImpersonate = useCallback(() => {
    setPage("impersonate");
    setSearch("");
  }, []);

  useShortcut("k", {
    meta: true,
    onTrigger: () => (open ? close() : setOpen(true)),
  });

  /* Only while the menu is open, so the shortcut cannot open a staff-only page
     from anywhere in the app the way ⌘K opens the menu itself. */
  useShortcut("i", {
    disabled: !(open && impersonation.allowed) || page === "impersonate",
    meta: true,
    onTrigger: toImpersonate,
  });

  function run(action: () => void) {
    close();
    action();
  }

  return (
    <CommandDialog
      onOpenChange={(next) => (next ? setOpen(true) : close())}
      open={open}
    >
      {/* cmdk filters on the typed value, but the impersonate results come
          already chosen by the server; filtering them again would hide a match
          found by email while a name was being typed. */}
      <Command shouldFilter={page === "main"}>
        <CommandInput
          onKeyDown={(event) => {
            if (event.key === "Escape" && page !== "main") {
              event.preventDefault();
              setPage("main");
              setSearch("");
            }
          }}
          onValueChange={setSearch}
          placeholder={
            page === "impersonate"
              ? "Search people to impersonate…"
              : "Type a command or search…"
          }
          value={search}
        />
        <CommandList>
          {page === "impersonate" ? (
            <ImpersonatePage
              onSelect={(userId) => run(() => impersonation.start(userId))}
              search={settledSearch}
            />
          ) : (
            <>
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
                {impersonation.allowed ? (
                  <CommandItem onSelect={toImpersonate}>
                    <UserSwitchIcon weight="fill" />
                    Impersonate user
                    <CommandShortcut>⌘I</CommandShortcut>
                  </CommandItem>
                ) : null}
                {impersonation.active ? (
                  <CommandItem onSelect={() => run(impersonation.stop)}>
                    <UserSwitchIcon weight="fill" />
                    Stop impersonating
                  </CommandItem>
                ) : null}
                <CommandItem
                  onSelect={() =>
                    run(() => openDialog("createOrganization", {}))
                  }
                >
                  <BuildingsIcon weight="fill" />
                  Create organization
                </CommandItem>
                <CommandItem
                  onSelect={() => run(() => openDialog("inviteMember", {}))}
                >
                  <PlusIcon />
                  Invite member
                </CommandItem>
                <CommandItem
                  onSelect={() =>
                    run(() =>
                      setTheme(resolvedTheme === "dark" ? "light" : "dark")
                    )
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
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

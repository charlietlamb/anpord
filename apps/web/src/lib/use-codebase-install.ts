import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { codebaseClient } from "@/lib/codebase-client";
import { codebaseKeys } from "@/lib/codebase-queries";

/**
 * Sending someone to GitHub to install the app, and catching them coming back.
 *
 * A plain navigation rather than an OAuth exchange: the install screen is a
 * page on github.com, and it returns here with `installation_id` in the query
 * string. That id is posted back to be read from GitHub before anything is
 * stored, because a number in an address bar proves nothing on its own.
 */
export function useCodebaseInstall(returnedId: number | undefined) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const connect = useMutation({
    mutationFn: codebaseClient.connect,
    onError: (error) => toast.error(error.message),
    onSuccess: async (account) => {
      await queryClient.invalidateQueries({ queryKey: codebaseKeys.all() });
      toast.success(`Connected ${account.login}`);
    },
  });

  const install = useMutation({
    mutationFn: codebaseClient.installUrl,
    onError: (error) => toast.error(error.message),
    onSuccess: ({ url }) => window.location.assign(url),
  });

  /* Arriving back from GitHub is a real synchronisation with the outside
     world -- the address bar as GitHub left it -- and it must happen once.
     The ref guards a second run, and the id is cleared from the URL so a
     reload cannot replay the connection. */
  const claimed = useRef<number | null>(null);
  const { mutate } = connect;

  useEffect(() => {
    if (returnedId === undefined || claimed.current === returnedId) {
      return;
    }

    claimed.current = returnedId;
    mutate(returnedId);
    navigate({ replace: true, search: {}, to: "/settings/codebase" });
  }, [mutate, navigate, returnedId]);

  return {
    /* Offered when the app is installed on GitHub but not recorded here,
       which is the ordinary outcome: GitHub sends an install to the app's
       callback -- the sign-in route -- and no id survives the trip. Called
       with nothing, the server asks GitHub which installation is ours. */
    claim: () => connect.mutate(undefined),
    connecting: connect.isPending,
    install: () => install.mutate(),
    installing: install.isPending,
  };
}

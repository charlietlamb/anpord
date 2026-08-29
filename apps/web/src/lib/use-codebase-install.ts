import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { codebaseClient } from "@/lib/codebase-client";
import { codebaseKeys } from "@/lib/codebase-queries";

/**
 * One action: connect this organisation to GitHub.
 *
 * It asks the server first, because the app is often already installed and
 * unrecorded -- GitHub sends an install to the app's callback, which is the
 * sign-in route, so no id survives the trip. Only when there is genuinely
 * nothing to claim does the browser leave for GitHub, which means the button
 * can say one thing rather than asking the reader to know which case they
 * are in.
 */
export function useCodebaseInstall(returnedId: number | undefined) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const leave = useMutation({
    mutationFn: codebaseClient.installUrl,
    onError: (error) => toast.error(error.message),
    onSuccess: ({ url }) => window.location.assign(url),
  });

  const connect = useMutation({
    mutationFn: codebaseClient.connect,
    onError: (error) => toast.error(error.message),
    onSuccess: async (account) => {
      /* Nothing to claim, so the reader goes and installs one. */
      if (account === null) {
        leave.mutate();
        return;
      }

      await queryClient.invalidateQueries({ queryKey: codebaseKeys.all() });
      toast.success(`Connected ${account.login}`);
    },
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
    connect: () => connect.mutate(undefined),
    /* One state for the reader: the button is busy from the moment it is
       pressed until either the account arrives or the browser leaves. */
    connecting: connect.isPending || leave.isPending,
  };
}

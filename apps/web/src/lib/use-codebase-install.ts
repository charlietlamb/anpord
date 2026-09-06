import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { codebaseClient } from "@/lib/codebase-client";
import { codebaseKeys } from "@/lib/codebase-queries";

/* GitHub sends installs to the app's callback (the sign-in route), so no id survives the trip and the server is asked first. */
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
      if (account === null) {
        leave.mutate();
        return;
      }

      await queryClient.invalidateQueries({ queryKey: codebaseKeys.all() });
      toast.success(`Connected ${account.login}`);
    },
  });

  /* The ref and the URL clear both guard against replaying the connection on a re-run or a reload. */
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
    connecting: connect.isPending || leave.isPending,
  };
}

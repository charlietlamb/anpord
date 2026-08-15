import { useEffect, useRef } from "react";
import { useOrganizations } from "@/lib/use-organizations";

export function useEnsureActiveOrganization() {
  const { organizations, activeOrganization, isPending, setActive } =
    useOrganizations();
  const attempted = useRef(false);

  useEffect(() => {
    if (isPending || activeOrganization || attempted.current) {
      return;
    }
    const first = organizations[0];
    if (!first) {
      return;
    }
    attempted.current = true;
    setActive(first.id);
  }, [isPending, activeOrganization, organizations, setActive]);
}

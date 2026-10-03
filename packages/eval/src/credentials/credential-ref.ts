import type { VariableOwner } from "../environment/variable-repository";

const VARIABLES = "variables:";
const ORGANIZATION = "organization";

export type CredentialRef =
  | { readonly kind: "connection"; readonly connectionId: string }
  | { readonly kind: "variables"; readonly userId: string | null };

export const variablesRef = (owner: VariableOwner) =>
  `${VARIABLES}${owner.userId ?? ORGANIZATION}`;

export const parseRef = (ref: string): CredentialRef => {
  if (!ref.startsWith(VARIABLES)) {
    return { connectionId: ref, kind: "connection" };
  }
  const who = ref.slice(VARIABLES.length);
  return { kind: "variables", userId: who === ORGANIZATION ? null : who };
};

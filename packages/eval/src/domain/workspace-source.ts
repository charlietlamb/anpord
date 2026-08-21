/** Where the code an agent works on comes from.
 *
 * `empty` is a sandbox with nothing in it, for a case that asks the agent to
 * build rather than to fix. `repo` is what a customer evaluates against.
 */
export type WorkspaceSource =
  | { readonly kind: "empty" }
  | { readonly kind: "files"; readonly files: Readonly<Record<string, string>> }
  | {
      readonly kind: "repo";
      readonly ref: string | null;
      readonly url: string;
    };

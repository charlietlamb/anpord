/** Where the code an agent works on comes from. */
export type WorkspaceSource =
  | { readonly kind: "empty" }
  | { readonly kind: "files"; readonly files: Readonly<Record<string, string>> }
  | {
      readonly kind: "repo";
      readonly ref: string | null;
      readonly url: string;
    };

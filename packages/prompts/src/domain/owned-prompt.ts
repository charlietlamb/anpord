declare const Owned: unique symbol;

/* Minted only by `requirePrompt`, from an org-scoped query: taking this
   instead of a bare string is what stops a write reaching another tenant. */
export type OwnedPromptId = string & { readonly [Owned]: true };

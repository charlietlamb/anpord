export interface VariantParts {
  readonly harness: string;
  readonly model: string;
  readonly profile?: string | null;
}

export const formatVariant = ({ harness, model, profile }: VariantParts) =>
  profile ? `${harness}/${model} (${profile})` : `${harness}/${model}`;

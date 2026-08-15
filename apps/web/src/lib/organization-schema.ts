import { z } from "zod";

export const orgNameSchema = z.string().min(1, "Enter an organization name.");

export const orgSlugSchema = z
  .string()
  .min(1, "Enter a slug.")
  .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and dashes.");

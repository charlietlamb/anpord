import type { Variables } from "@anpord/template/render";

/**
 * What each prompt's variables are, filled in by `anpord generate`.
 *
 * Empty here on purpose. A caller who never generates gets the loose shape and
 * everything works; a caller who does gets their own prompts named, and a
 * misspelling becomes a compile error rather than a brace reaching a model.
 */
// biome-ignore lint/suspicious/noEmptyInterface: the generated file fills it
export interface AnpordPromptVariables {}

type Known = keyof AnpordPromptVariables & string;

/** A widened id cannot be looked up, so a caller building one at runtime keeps
 * the loose shape rather than being refused. */
type IsLiteral<Id extends string> = string extends Id ? false : true;

type Declared<Id extends string> = Id extends Known
  ? AnpordPromptVariables[Id]
  : never;

/** Names the template does not use, so passing one is a compile error that
 * says which. */
type Unexpected<Id extends string, Given> = Exclude<
  keyof Given,
  keyof Declared<Id>
>;

export type VariablesFor<Id extends string, Given> =
  IsLiteral<Id> extends true
    ? Id extends Known
      ? [Unexpected<Id, Given>] extends [never]
        ? Declared<Id>
        : Declared<Id> & Record<Unexpected<Id, Given>, never>
      : Variables
    : Variables;

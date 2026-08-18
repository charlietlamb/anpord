import type { Variables } from "@anpord/template/render";

/**
 * What each prompt's variables are, filled in by `anpord generate`.
 *
 * Empty here on purpose. A caller who never generates passes whatever they
 * like and everything works; a caller who does gets their own prompts named,
 * and a misspelling becomes a compile error rather than a brace reaching a
 * model.
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

/**
 * Whether the declarations name any variable for this prompt.
 *
 * A prompt that had none when the file was written is not a prompt that can
 * never have any: somebody adds one in the dashboard and a build that never
 * touched it stops compiling. Declaring none is read as not knowing rather
 * than as knowing there are none, so only a prompt with named variables holds
 * a caller to a shape.
 */
type Names<Id extends string> = Id extends Known
  ? Declared<Id> extends Record<string, never>
    ? false
    : true
  : false;

/** Names the template does not use, so passing one is a compile error that
 * says which. */
type Unexpected<Id extends string, Given> = Exclude<
  keyof Given,
  keyof Declared<Id>
>;

export type VariablesFor<Id extends string, Given> =
  IsLiteral<Id> extends true
    ? Names<Id> extends true
      ? [Unexpected<Id, Given>] extends [never]
        ? Declared<Id>
        : Declared<Id> & Record<Unexpected<Id, Given>, never>
      : Variables
    : Variables;

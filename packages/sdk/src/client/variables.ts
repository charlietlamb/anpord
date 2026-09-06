import type { Variables } from "@anpord/template/render";

/** Filled in by `anpord generate`; empty here so callers who never generate
 * stay unconstrained. */
// biome-ignore lint/suspicious/noEmptyInterface: the generated file fills it
export interface AnpordPromptVariables {}

type Known = keyof AnpordPromptVariables & string;

/** A widened id cannot be looked up, so a runtime-built one keeps the loose
 * shape rather than being refused. */
type IsLiteral<Id extends string> = string extends Id ? false : true;

type Declared<Id extends string> = Id extends Known
  ? AnpordPromptVariables[Id]
  : never;

/** No declared variables reads as "unknown", not "none", so a variable added
 * in the dashboard cannot break a build that never touched the prompt. */
type Names<Id extends string> = Id extends Known
  ? Declared<Id> extends Record<string, never>
    ? false
    : true
  : false;

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

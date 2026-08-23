/**
 * Where each page of a cursor listing began.
 *
 * A stack rather than a page number, because a cursor only points forwards: a
 * keyset query answers "what comes after this row", and asking what came
 * before it is a different query. Going back replays a cursor the reader
 * already passed through, which costs nothing and cannot drift.
 *
 * The first entry is null, the position before any cursor, so the depth of the
 * stack is the page a reader is on.
 */
export type CursorStack<A> = readonly (A | null)[];

export const firstPage = <A>(): CursorStack<A> => [null];

export const cursorOf = <A>(stack: CursorStack<A>): A | null =>
  stack.at(-1) ?? null;

export const pageOf = <A>(stack: CursorStack<A>): number => stack.length;

export const pushed = <A>(stack: CursorStack<A>, next: A): CursorStack<A> => [
  ...stack,
  next,
];

/* Popping the first page would leave the list with no position at all, so the
   floor holds rather than the stack emptying. */
export const popped = <A>(stack: CursorStack<A>): CursorStack<A> =>
  stack.length > 1 ? stack.slice(0, -1) : stack;

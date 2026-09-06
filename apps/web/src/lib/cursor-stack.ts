/* A stack, not a page number: a keyset cursor only points forwards, so going back replays one already passed. The leading null is the position before any cursor. */
export type CursorStack<A> = readonly (A | null)[];

export const firstPage = <A>(): CursorStack<A> => [null];

export const cursorOf = <A>(stack: CursorStack<A>): A | null =>
  stack.at(-1) ?? null;

export const pageOf = <A>(stack: CursorStack<A>): number => stack.length;

export const pushed = <A>(stack: CursorStack<A>, next: A): CursorStack<A> => [
  ...stack,
  next,
];

/* Popping the first page would leave the list with no position at all, so the floor holds. */
export const popped = <A>(stack: CursorStack<A>): CursorStack<A> =>
  stack.length > 1 ? stack.slice(0, -1) : stack;

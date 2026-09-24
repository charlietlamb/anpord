export type CursorStack<A> = readonly (A | null)[];

export const firstPage = <A>(): CursorStack<A> => [null];

export const cursorOf = <A>(stack: CursorStack<A>): A | null =>
  stack.at(-1) ?? null;

export const pageOf = <A>(stack: CursorStack<A>): number => stack.length;

export const pushed = <A>(stack: CursorStack<A>, next: A): CursorStack<A> => [
  ...stack,
  next,
];

export const popped = <A>(stack: CursorStack<A>): CursorStack<A> =>
  stack.length > 1 ? stack.slice(0, -1) : stack;

/* `%` and `_` are LIKE wildcards, so searching "100%" would otherwise match
   everything starting with "100". */
export const escapeLike = (term: string) =>
  term.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");

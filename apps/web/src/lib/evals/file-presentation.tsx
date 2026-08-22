import {
  FileCodeIcon,
  FileCssIcon,
  FileHtmlIcon,
  FileImageIcon,
  FileMdIcon,
  FileTextIcon,
  type Icon,
} from "@phosphor-icons/react";

/**
 * What a changed file is, in one glyph.
 *
 * Matched on the extension rather than the path, so a file keeps its icon
 * wherever it moves. Phosphor draws these rather than a vendor set, so they
 * sit at the same weight as every other icon on the screen instead of
 * importing a second visual language into one list.
 *
 * Pictorial marks only. Phosphor also ships lettered ones (FileTsx draws
 * "TSX" inside the page), and at the 14px these render at the lettering is
 * three grey smudges. A generic code mark says more than an illegible
 * specific one.
 */
const BY_EXTENSION: Record<string, Icon> = {
  css: FileCssIcon,
  gif: FileImageIcon,
  htm: FileHtmlIcon,
  html: FileHtmlIcon,
  jpeg: FileImageIcon,
  jpg: FileImageIcon,
  js: FileCodeIcon,
  jsx: FileCodeIcon,
  md: FileMdIcon,
  mdx: FileMdIcon,
  mjs: FileCodeIcon,
  png: FileImageIcon,
  py: FileCodeIcon,
  scss: FileCssIcon,
  svg: FileImageIcon,
  ts: FileCodeIcon,
  tsx: FileCodeIcon,
  txt: FileTextIcon,
  webp: FileImageIcon,
};

/* A dotfile is all extension and no name, so splitting on the last dot would
   call `.gitignore` a gitignore file. */
const extensionOf = (path: string): string => {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");

  return dot <= 0 ? "" : name.slice(dot + 1).toLowerCase();
};

/** Falls back to a generic file rather than nothing: an agent can write any
 * extension, and a row with no icon would sit ragged against the ones that
 * have them. */
export const fileIcon = (path: string): Icon =>
  BY_EXTENSION[extensionOf(path)] ?? FileCodeIcon;

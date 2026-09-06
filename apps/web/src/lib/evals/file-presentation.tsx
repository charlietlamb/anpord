import {
  FileCodeIcon,
  FileCssIcon,
  FileHtmlIcon,
  FileImageIcon,
  FileMdIcon,
  FileTextIcon,
  type Icon,
} from "@phosphor-icons/react";

/* Pictorial marks only: Phosphor's lettered file icons are illegible at the 14px these render at. */
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

/* A dotfile is all extension and no name, so `.gitignore` must not read as a gitignore file. */
const extensionOf = (path: string): string => {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");

  return dot <= 0 ? "" : name.slice(dot + 1).toLowerCase();
};

export const fileIcon = (path: string): Icon =>
  BY_EXTENSION[extensionOf(path)] ?? FileCodeIcon;

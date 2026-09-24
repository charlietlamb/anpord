import {
  SiCss,
  SiGo,
  SiHtml5,
  SiJavascript,
  SiJson,
  SiMarkdown,
  SiPython,
  SiReact,
  SiRust,
  SiTypescript,
  SiYaml,
} from "@icons-pack/react-simple-icons";
import {
  FileCodeIcon,
  FileImageIcon,
  FileTextIcon,
  type Icon,
} from "@phosphor-icons/react";

type FileGlyph = Icon | typeof SiTypescript;

const BY_EXTENSION: Record<string, FileGlyph> = {
  cjs: SiJavascript,
  cts: SiTypescript,
  css: SiCss,
  gif: FileImageIcon,
  go: SiGo,
  htm: SiHtml5,
  html: SiHtml5,
  jpeg: FileImageIcon,
  jpg: FileImageIcon,
  js: SiJavascript,
  json: SiJson,
  jsx: SiReact,
  md: SiMarkdown,
  mdx: SiMarkdown,
  mjs: SiJavascript,
  mts: SiTypescript,
  png: FileImageIcon,
  py: SiPython,
  rs: SiRust,
  scss: SiCss,
  svg: FileImageIcon,
  ts: SiTypescript,
  tsx: SiReact,
  txt: FileTextIcon,
  webp: FileImageIcon,
  yaml: SiYaml,
  yml: SiYaml,
};

const extensionOf = (path: string): string => {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");

  return dot <= 0 ? "" : name.slice(dot + 1).toLowerCase();
};

export const fileIcon = (path: string): FileGlyph =>
  BY_EXTENSION[extensionOf(path)] ?? FileCodeIcon;

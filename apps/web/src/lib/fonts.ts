import geistRanges from "@fontsource-variable/geist/unicode.json" with {
  type: "json",
};
import geistMonoRanges from "@fontsource-variable/geist-mono/unicode.json" with {
  type: "json",
};

const FILES = import.meta.glob<string>(
  "/node_modules/@fontsource-variable/{geist,geist-mono}/files/*-wght-normal.woff2",
  { eager: true, import: "default", query: "?url" }
);

const fileOf = (pkg: string, subset: string) =>
  FILES[
    `/node_modules/@fontsource-variable/${pkg}/files/${pkg}-${subset}-wght-normal.woff2`
  ];

const facesOf = (family: string, pkg: string, ranges: Record<string, string>) =>
  Object.entries(ranges).map(([subset, unicodeRange]) => ({
    family,
    preloaded: subset === "latin",
    unicodeRange,
    url: fileOf(pkg, subset),
  }));

const FACES = [
  ...facesOf("Geist Variable", "geist", geistRanges),
  ...facesOf("Geist Mono Variable", "geist-mono", geistMonoRanges),
];

export const LOAD_FONTS = `for (const { family, preloaded, unicodeRange, url } of ${JSON.stringify(FACES)}) {
  const face = new FontFace(family, \`url(\${url}) format("woff2-variations")\`, { display: "block", unicodeRange, weight: "100 900" });
  document.fonts.add(face);
  if (preloaded) face.load();
}`;

export const FONT_PRELOADS = FACES.flatMap((face) =>
  face.preloaded
    ? [
        {
          as: "font",
          crossOrigin: "anonymous" as const,
          href: face.url,
          rel: "preload",
          type: "font/woff2",
        },
      ]
    : []
);

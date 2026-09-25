export interface HeaderPreset {
  readonly bar: string;
  readonly chrome?: "glow" | "morph";
  readonly cta: "outline" | "raised" | "glass" | "subtle";
  readonly description: string;
  readonly extra?: "shortcut" | "stars";
  readonly id: string;
  readonly inner: string;
  readonly link: string;
  readonly name: string;
  readonly nav: "left" | "centre" | "segmented";
  readonly offset: string;
  readonly signIn?: "outline" | "vercel";
  readonly source: string;
}

export interface HeaderFamily {
  readonly description: string;
  readonly name: string;
  readonly presets: readonly HeaderPreset[];
}

const FLOAT = "sticky z-50 w-full";

const preset = (
  id: string,
  name: string,
  source: string,
  description: string,
  parts: Omit<HeaderPreset, "description" | "id" | "name" | "source">
): HeaderPreset => ({ description, id, name, source, ...parts });

const CAPSULE: HeaderFamily = {
  description: "Fully rounded pills, floating clear of the top edge.",
  name: "Capsules",
  presets: [
    preset(
      "capsule",
      "Solid capsule",
      "Modal",
      "Opaque pill, 24px clear, three-column grid. No scroll behaviour.",
      {
        bar: "rounded-full bg-card shadow-[0_10px_15px_-3px_rgb(0_0_0/0.1),0_4px_6px_-4px_rgb(0_0_0/0.1)] dark:bg-muted",
        cta: "raised",
        inner: "h-12 gap-10 px-2.5 pl-5",
        link: "rounded-full",
        nav: "centre",
        offset: `${FLOAT} top-6 max-w-[1304px] px-6`,
      }
    ),
    preset(
      "frosted-pill",
      "Frosted pill",
      "Prisma",
      "The narrow frosted capsule a collapsing header settles into.",
      {
        bar: "rounded-full border border-alpha-8 bg-card/85 backdrop-blur-lg dark:bg-muted/85",
        cta: "raised",
        inner: "h-14 gap-6 px-5",
        link: "rounded-full",
        nav: "centre",
        offset: `${FLOAT} top-3 max-w-[896px] px-5`,
      }
    ),
    preset(
      "narrow",
      "Narrow",
      "Prisma",
      "A tight capsule holding only what it needs, floating well clear.",
      {
        bar: "rounded-full border border-border bg-card/80 shadow-[0_10px_40px_-16px_rgb(0_0_0/0.5)] backdrop-blur-xl dark:bg-muted/70",
        cta: "raised",
        inner: "h-11 gap-5 px-2.5 pl-4",
        link: "rounded-full",
        nav: "centre",
        offset: `${FLOAT} top-6 max-w-[860px] px-4`,
      }
    ),
    preset(
      "capsule-wide",
      "Wide capsule",
      "Modal",
      "The same pill stretched nearly edge to edge.",
      {
        bar: "rounded-full border border-alpha-8 bg-card/70 shadow-sm backdrop-blur-xl dark:bg-muted/60",
        cta: "raised",
        inner: "h-12 gap-8 px-2.5 pl-6",
        link: "rounded-full",
        nav: "left",
        offset: `${FLOAT} top-4 max-w-[1480px] px-6`,
      }
    ),
    preset(
      "capsule-tall",
      "Tall capsule",
      "Modal",
      "More vertical room, giving the mark and links space to breathe.",
      {
        bar: "rounded-full border border-border bg-card/75 shadow-[0_8px_30px_-12px_rgb(0_0_0/0.35)] backdrop-blur-xl dark:bg-muted/65",
        cta: "raised",
        inner: "h-16 gap-8 px-3 pl-6",
        link: "rounded-full",
        nav: "centre",
        offset: `${FLOAT} top-6 max-w-[1200px] px-5`,
      }
    ),
  ],
};

const CARD: HeaderFamily = {
  description: "Rounded rectangles rather than pills, closer to app surfaces.",
  name: "Cards",
  presets: [
    preset(
      "hairline-card",
      "Hairline card",
      "Clerk",
      "No border: a 0.5px inset highlight and ring drawn purely in shadow.",
      {
        bar: "rounded-xl border-0 bg-card/90 shadow-[inset_0_0_0_0.5px_rgb(255_255_255/0.9),0_0_0_0.5px_rgb(19_19_22/0.15),0_2px_3px_rgb(0_0_0/0.04),0_4px_6px_rgb(34_42_53/0.04),0_1px_1px_rgb(0_0_0/0.05)] backdrop-blur-md dark:bg-muted/90 dark:shadow-[inset_0_0_0_0.5px_rgb(255_255_255/0.08),0_0_0_0.5px_rgb(0_0_0/0.6),0_2px_3px_rgb(0_0_0/0.3)]",
        cta: "raised",
        inner: "h-[42px] gap-6 px-2 pl-3",
        link: "rounded-lg",
        nav: "left",
        offset: `${FLOAT} top-2 max-w-[1228px] px-5`,
      }
    ),
    preset(
      "slab",
      "Detaching slab",
      "Inngest",
      "A 6px-radius slab, not a pill. Tight 4px padding around an inner bar.",
      {
        bar: "rounded-md bg-card p-1 shadow-sm dark:bg-muted",
        cta: "raised",
        inner: "h-10 gap-6 rounded px-3",
        link: "rounded",
        nav: "left",
        offset: `${FLOAT} top-4 max-w-[1392px] px-6`,
      }
    ),
    preset(
      "soft-card",
      "Soft card",
      "Clerk",
      "A gently rounded card sitting close to the app's own surfaces.",
      {
        bar: "rounded-xl border border-border bg-card/75 shadow-sm backdrop-blur-xl dark:bg-muted/65",
        cta: "raised",
        inner: "h-14 gap-6 px-4",
        link: "rounded-md",
        nav: "left",
        offset: `${FLOAT} top-5 max-w-[1180px] px-5`,
      }
    ),
    preset(
      "framed",
      "Framed",
      "Anpord",
      "The frame treatment from the app: a padded shell around an inner bar.",
      {
        bar: "rounded-2xl bg-muted/70 p-1 shadow-sm backdrop-blur-xl dark:bg-card/70",
        cta: "raised",
        inner:
          "h-12 gap-6 rounded-xl border border-border bg-card px-4 dark:bg-muted",
        link: "rounded-md",
        nav: "left",
        offset: `${FLOAT} top-5 max-w-[1160px] px-5`,
      }
    ),
    preset(
      "solid-card",
      "Solid card",
      "Inngest",
      "No transparency at all: an opaque slab resting on the artwork.",
      {
        bar: "rounded-2xl border border-border bg-card shadow-[0_12px_40px_-16px_rgb(0_0_0/0.55)] dark:bg-muted",
        cta: "raised",
        inner: "h-14 gap-6 px-4",
        link: "rounded-lg",
        nav: "left",
        offset: `${FLOAT} top-5 max-w-[1160px] px-5`,
      }
    ),
  ],
};

const GLASS: HeaderFamily = {
  description: "Transparency, blur and light doing the work instead of a fill.",
  name: "Glass",
  presets: [
    preset(
      "hairline",
      "Hairline",
      "Dub",
      "Barely there: a thin outline and almost no fill.",
      {
        bar: "rounded-2xl border border-alpha-8 bg-background/30 backdrop-blur-md",
        cta: "outline",
        inner: "h-13 gap-6 px-4",
        link: "rounded-lg",
        nav: "left",
        offset: `${FLOAT} top-5 max-w-[1140px] px-5`,
      }
    ),
    preset(
      "inset-glow",
      "Inset glow",
      "Anpord",
      "The glass button treatment scaled up to the full bar.",
      {
        bar: "rounded-2xl border-0 bg-[linear-gradient(to_bottom,color-mix(in_oklch,var(--foreground)_9%,transparent),color-mix(in_oklch,var(--foreground)_4%,transparent))] shadow-[inset_0_1px_0_0_rgb(255_255_255/0.6),inset_0_0_0_1px_color-mix(in_oklch,var(--foreground)_12%,transparent),0_1px_2px_0_rgb(0_0_0/0.08)] backdrop-blur-md dark:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.12),inset_0_0_0_1px_rgb(255_255_255/0.08),0_1px_3px_0_rgb(0_0_0/0.5)]",
        cta: "raised",
        inner: "h-13 gap-6 px-4",
        link: "rounded-lg",
        nav: "left",
        offset: `${FLOAT} top-5 max-w-[1140px] px-5`,
      }
    ),
    preset(
      "gradient-fill",
      "Dissolving edge",
      "Linear",
      "A vertical gradient fill so the bottom edge melts into the page.",
      {
        bar: "rounded-2xl border border-alpha-8 bg-[linear-gradient(color-mix(in_oklch,var(--card)_88%,transparent),color-mix(in_oklch,var(--card)_72%,transparent))] backdrop-blur-xl",
        cta: "raised",
        inner: "h-14 gap-6 px-4",
        link: "rounded-full",
        nav: "left",
        offset: `${FLOAT} top-4 max-w-[1240px] px-5`,
      }
    ),
    preset(
      "heavy-blur",
      "Heavy blur",
      "Convex",
      "Saturated blur over a very light fill, so the dither reads through.",
      {
        bar: "rounded-2xl border border-alpha-8 bg-card/40 [backdrop-filter:blur(24px)_saturate(180%)]",
        cta: "raised",
        inner: "h-14 gap-6 px-4",
        link: "rounded-lg",
        nav: "centre",
        offset: `${FLOAT} top-4 max-w-[1240px] px-5`,
      }
    ),
    preset(
      "no-blur",
      "Clear",
      "Vercel",
      "No blur at all: just a hairline ring over the raw artwork.",
      {
        bar: "rounded-2xl border border-alpha-8 bg-transparent",
        cta: "raised",
        inner: "h-14 gap-6 px-4",
        link: "rounded-lg",
        nav: "left",
        offset: `${FLOAT} top-4 max-w-[1240px] px-5`,
      }
    ),
  ],
};

const BEHAVIOUR: HeaderFamily = {
  description: "Headers that change as you scroll or move the pointer.",
  name: "Behaviour",
  presets: [
    preset(
      "collapsing",
      "Collapsing pill",
      "Prisma",
      "Full width and transparent at rest; collapses to 896px frosted on scroll.",
      {
        bar: "rounded-full border border-alpha-8 bg-card/85 backdrop-blur-lg dark:bg-muted/85",
        chrome: "morph",
        cta: "raised",
        inner: "h-14 gap-6 px-5",
        link: "rounded-full",
        nav: "centre",
        offset: `${FLOAT} top-3 max-w-[896px] px-5`,
      }
    ),
    preset(
      "glow",
      "Cursor glow",
      "Liveblocks",
      "A radial highlight tracks the pointer along the bar.",
      {
        bar: "rounded-2xl border border-alpha-8 bg-card/70 backdrop-blur-xl dark:bg-muted/65",
        chrome: "glow",
        cta: "raised",
        inner: "h-14 gap-6 px-4",
        link: "rounded-md",
        nav: "left",
        offset: `${FLOAT} top-4 max-w-[1200px] px-5`,
      }
    ),
    preset(
      "collapsing-card",
      "Collapsing card",
      "Inngest",
      "The same scroll morph, settling into a card rather than a pill.",
      {
        bar: "rounded-xl border border-border bg-card/85 shadow-sm backdrop-blur-lg dark:bg-muted/85",
        chrome: "morph",
        cta: "raised",
        inner: "h-12 gap-6 px-4",
        link: "rounded-md",
        nav: "left",
        offset: `${FLOAT} top-3 max-w-[1024px] px-5`,
      }
    ),
    preset(
      "glow-capsule",
      "Glow capsule",
      "Liveblocks",
      "Pointer glow inside a fully rounded pill.",
      {
        bar: "rounded-full border border-alpha-8 bg-card/70 backdrop-blur-xl dark:bg-muted/65",
        chrome: "glow",
        cta: "raised",
        inner: "h-12 gap-8 px-2.5 pl-5",
        link: "rounded-full",
        nav: "centre",
        offset: `${FLOAT} top-5 max-w-[1160px] px-5`,
      }
    ),
    preset(
      "collapsing-wide",
      "Collapsing, wide",
      "Prisma",
      "Starts full-bleed and settles wide rather than narrow.",
      {
        bar: "rounded-2xl border border-alpha-8 bg-card/85 backdrop-blur-lg dark:bg-muted/85",
        chrome: "morph",
        cta: "raised",
        inner: "h-14 gap-6 px-5",
        link: "rounded-lg",
        nav: "left",
        offset: `${FLOAT} top-4 max-w-[1320px] px-6`,
      }
    ),
  ],
};

const STRUCTURE: HeaderFamily = {
  description: "The arrangement itself is the idea, not the surface.",
  name: "Structure",
  presets: [
    preset(
      "segmented",
      "Segmented groups",
      "Convex",
      "Three separate floating pills, read as a toolbar cluster.",
      {
        bar: "border-0 bg-transparent shadow-none",
        cta: "raised",
        inner: "h-11 gap-3 px-0",
        link: "rounded-full",
        nav: "segmented",
        offset: `${FLOAT} top-5 max-w-[1200px] px-5`,
      }
    ),
    preset(
      "stats",
      "Stat chips",
      "Convex",
      "The header carries social proof: stars and weekly installs.",
      {
        bar: "rounded-2xl border border-alpha-8 bg-card/75 backdrop-blur-xl dark:bg-muted/70",
        cta: "raised",
        extra: "stars",
        inner: "h-16 gap-6 px-4",
        link: "rounded-lg",
        nav: "left",
        offset: `${FLOAT} top-4 max-w-[1440px] px-6`,
      }
    ),
    preset(
      "shortcut",
      "Command hint",
      "Dub",
      "Rounded-rect hover targets and a ⌘K chip beside the CTA.",
      {
        bar: "rounded-lg border border-alpha-8 bg-card/75 backdrop-blur-lg dark:bg-muted/70",
        cta: "raised",
        extra: "shortcut",
        inner: "h-14 gap-6 px-3",
        link: "rounded-lg",
        nav: "left",
        offset: `${FLOAT} top-3 max-w-[1024px] px-5`,
      }
    ),
    preset(
      "segmented-capsule",
      "Segmented, tall",
      "Convex",
      "The same cluster with more air between the groups.",
      {
        bar: "border-0 bg-transparent shadow-none",
        cta: "raised",
        inner: "h-12 gap-5 px-0",
        link: "rounded-full",
        nav: "segmented",
        offset: `${FLOAT} top-6 max-w-[1340px] px-6`,
      }
    ),
    preset(
      "stats-capsule",
      "Stat chips, pill",
      "Convex",
      "Social proof inside a fully rounded bar.",
      {
        bar: "rounded-full border border-alpha-8 bg-card/75 backdrop-blur-xl dark:bg-muted/70",
        cta: "raised",
        extra: "stars",
        inner: "h-14 gap-6 px-3 pl-6",
        link: "rounded-full",
        nav: "left",
        offset: `${FLOAT} top-4 max-w-[1380px] px-6`,
      }
    ),
  ],
};

const COLOUR: HeaderFamily = {
  description: "Colour in the border or the fill, rather than neutral chrome.",
  name: "Colour",
  presets: [
    preset(
      "gradient-ring",
      "Gradient ring",
      "Vercel",
      "The one-pixel border carries a masked colour gradient.",
      {
        bar: "rounded-2xl border border-transparent bg-[linear-gradient(color-mix(in_oklch,var(--card)_80%,transparent),color-mix(in_oklch,var(--card)_80%,transparent)),linear-gradient(120deg,var(--success),var(--primary)_40%,transparent_70%)] [background-clip:padding-box,border-box] [background-origin:border-box] [backdrop-filter:blur(20px)_saturate(180%)]",
        cta: "raised",
        inner: "h-13 gap-6 px-4",
        link: "rounded-lg",
        nav: "left",
        offset: `${FLOAT} top-5 max-w-[1180px] px-5`,
      }
    ),
    preset(
      "gradient-ring-pill",
      "Gradient ring, pill",
      "Vercel",
      "The same masked ring wrapped around a capsule.",
      {
        bar: "rounded-full border border-transparent bg-[linear-gradient(color-mix(in_oklch,var(--card)_82%,transparent),color-mix(in_oklch,var(--card)_82%,transparent)),linear-gradient(120deg,var(--primary),var(--success)_45%,transparent_75%)] [background-clip:padding-box,border-box] [background-origin:border-box] backdrop-blur-xl",
        cta: "raised",
        inner: "h-12 gap-8 px-2.5 pl-5",
        link: "rounded-full",
        nav: "centre",
        offset: `${FLOAT} top-5 max-w-[1160px] px-5`,
      }
    ),
    preset(
      "top-highlight",
      "Top highlight",
      "Clerk",
      "A single bright line along the upper edge, as if lit from above.",
      {
        bar: "rounded-2xl border border-alpha-8 bg-card/75 shadow-[inset_0_1px_0_0_color-mix(in_oklch,var(--foreground)_25%,transparent)] backdrop-blur-xl dark:bg-muted/70",
        cta: "raised",
        inner: "h-14 gap-6 px-4",
        link: "rounded-lg",
        nav: "left",
        offset: `${FLOAT} top-4 max-w-[1220px] px-5`,
      }
    ),
    preset(
      "tinted",
      "Tinted",
      "Daytona",
      "A wash of brand colour through the fill rather than the border.",
      {
        bar: "rounded-2xl border border-alpha-8 bg-[color-mix(in_oklch,var(--primary)_10%,var(--card))]/80 backdrop-blur-xl",
        cta: "raised",
        inner: "h-14 gap-6 px-4",
        link: "rounded-lg",
        nav: "left",
        offset: `${FLOAT} top-4 max-w-[1220px] px-5`,
      }
    ),
    preset(
      "ambient",
      "Ambient shadow",
      "Modal",
      "A coloured glow pooling beneath the bar rather than a grey drop.",
      {
        bar: "rounded-full border border-alpha-8 bg-card/80 shadow-[0_16px_50px_-20px_color-mix(in_oklch,var(--primary)_70%,transparent)] backdrop-blur-xl dark:bg-muted/75",
        cta: "raised",
        inner: "h-12 gap-8 px-2.5 pl-5",
        link: "rounded-full",
        nav: "centre",
        offset: `${FLOAT} top-6 max-w-[1160px] px-5`,
      }
    ),
  ],
};

const FLUSH: HeaderFamily = {
  description: "Attached to the top edge, the way most of the market ships it.",
  name: "Flush",
  presets: [
    preset(
      "flush-hairline",
      "Flush hairline",
      "Mintlify",
      "The market default: full-bleed bar, 64px, one hairline underneath.",
      {
        bar: "w-full border-alpha-8 border-b bg-background/80 backdrop-blur-md",
        cta: "raised",
        inner: "mx-auto h-16 max-w-[1280px] gap-8 px-6",
        link: "rounded-md",
        nav: "left",
        offset: "sticky top-0 z-50 w-full",
      }
    ),
    preset(
      "flush-centre",
      "Flush, centred nav",
      "Mintlify",
      "The same bar with the links absolutely centred.",
      {
        bar: "w-full border-alpha-8 border-b bg-background/80 backdrop-blur-md",
        cta: "raised",
        inner: "mx-auto h-16 max-w-[1280px] gap-8 px-6",
        link: "rounded-md",
        nav: "centre",
        offset: "sticky top-0 z-50 w-full",
      }
    ),
    preset(
      "flush-borderless",
      "Flush, borderless",
      "Braintrust",
      "No line at all: separation by background alone.",
      {
        bar: "w-full bg-background",
        cta: "raised",
        inner: "mx-auto h-16 max-w-[1440px] gap-8 px-8",
        link: "rounded-md",
        nav: "left",
        offset: "sticky top-0 z-50 w-full",
      }
    ),
    preset(
      "flush-shadow-line",
      "Flush, shadow line",
      "Vercel",
      "The hairline is a box-shadow, so it never affects layout.",
      {
        bar: "w-full bg-background shadow-[0_1px_0_color-mix(in_oklch,var(--foreground)_14%,transparent)]",
        cta: "raised",
        inner: "mx-auto h-16 max-w-[1448px] gap-8 px-6",
        link: "rounded-md",
        nav: "left",
        offset: "sticky top-0 z-50 w-full",
      }
    ),
    preset(
      "flush-tall",
      "Flush, tall",
      "Convex",
      "An 80px bar with room for chips beside the links.",
      {
        bar: "w-full border-alpha-8 border-b bg-background/85 backdrop-blur-md",
        cta: "raised",
        extra: "stars",
        inner: "mx-auto h-20 max-w-[1536px] gap-8 px-12",
        link: "rounded-full",
        nav: "left",
        offset: "sticky top-0 z-50 w-full",
      }
    ),
  ],
};

const COMPACT: HeaderFamily = {
  description: "Small, quiet headers that stay out of the hero's way.",
  name: "Compact",
  presets: [
    preset(
      "compact-pill",
      "Compact pill",
      "Cursor",
      "A 44px capsule with small, tight controls.",
      {
        bar: "rounded-full border border-alpha-8 bg-card/80 backdrop-blur-xl dark:bg-muted/75",
        cta: "raised",
        inner: "h-11 gap-6 px-2 pl-4",
        link: "rounded-full",
        nav: "centre",
        offset: `${FLOAT} top-4 max-w-[980px] px-4`,
      }
    ),
    preset(
      "compact-card",
      "Compact card",
      "Dub",
      "The same restraint with a small radius.",
      {
        bar: "rounded-lg border border-alpha-8 bg-card/80 backdrop-blur-lg dark:bg-muted/75",
        cta: "raised",
        inner: "h-11 gap-6 px-2 pl-3",
        link: "rounded-md",
        nav: "left",
        offset: `${FLOAT} top-3 max-w-[960px] px-4`,
      }
    ),
    preset(
      "minimal",
      "Minimal",
      "Braintrust",
      "No chrome whatsoever: the mark and links sit on the artwork.",
      {
        bar: "border-0 bg-transparent shadow-none",
        cta: "outline",
        inner: "h-14 gap-6 px-0",
        link: "rounded-full",
        nav: "left",
        offset: `${FLOAT} top-2 max-w-[1240px] px-6`,
      }
    ),
    preset(
      "minimal-centre",
      "Minimal, centred",
      "Braintrust",
      "Chromeless with the links pulled into the middle.",
      {
        bar: "border-0 bg-transparent shadow-none",
        cta: "outline",
        inner: "h-14 gap-6 px-0",
        link: "rounded-full",
        nav: "centre",
        offset: `${FLOAT} top-2 max-w-[1240px] px-6`,
      }
    ),
    preset(
      "compact-shortcut",
      "Compact, ⌘K",
      "Dub",
      "Small bar whose second action is a command hint.",
      {
        bar: "rounded-full border border-alpha-8 bg-card/80 backdrop-blur-xl dark:bg-muted/75",
        cta: "raised",
        extra: "shortcut",
        inner: "h-11 gap-6 px-2 pl-4",
        link: "rounded-full",
        nav: "left",
        offset: `${FLOAT} top-4 max-w-[900px] px-4`,
      }
    ),
  ],
};

const WIDTH: HeaderFamily = {
  description: "The same treatment tried at very different widths.",
  name: "Width",
  presets: [
    preset(
      "width-narrow",
      "860",
      "Prisma",
      "Narrow enough that the bar reads as a control, not a frame.",
      {
        bar: "rounded-full border border-alpha-8 bg-card/80 backdrop-blur-xl dark:bg-muted/75",
        cta: "raised",
        inner: "h-12 gap-6 px-2.5 pl-5",
        link: "rounded-full",
        nav: "centre",
        offset: `${FLOAT} top-5 max-w-[860px] px-4`,
      }
    ),
    preset("width-mid", "1080", "Mintlify", "Matches the documentation grid.", {
      bar: "rounded-full border border-alpha-8 bg-card/80 backdrop-blur-xl dark:bg-muted/75",
      cta: "raised",
      inner: "h-12 gap-6 px-2.5 pl-5",
      link: "rounded-full",
      nav: "centre",
      offset: `${FLOAT} top-5 max-w-[1080px] px-5`,
    }),
    preset(
      "width-wide",
      "1280",
      "e2b",
      "The most common container width in the market.",
      {
        bar: "rounded-full border border-alpha-8 bg-card/80 backdrop-blur-xl dark:bg-muted/75",
        cta: "raised",
        inner: "h-12 gap-6 px-2.5 pl-5",
        link: "rounded-full",
        nav: "centre",
        offset: `${FLOAT} top-5 max-w-[1280px] px-5`,
      }
    ),
    preset(
      "width-xwide",
      "1440",
      "Braintrust",
      "Wide enough to track the hero rather than sit inside it.",
      {
        bar: "rounded-full border border-alpha-8 bg-card/80 backdrop-blur-xl dark:bg-muted/75",
        cta: "raised",
        inner: "h-12 gap-6 px-2.5 pl-5",
        link: "rounded-full",
        nav: "centre",
        offset: `${FLOAT} top-5 max-w-[1440px] px-6`,
      }
    ),
    preset(
      "width-full",
      "Full bleed",
      "Langfuse",
      "Only the corner radius keeps it off the edges.",
      {
        bar: "rounded-2xl border border-alpha-8 bg-card/80 backdrop-blur-xl dark:bg-muted/75",
        cta: "raised",
        inner: "h-12 gap-6 px-4",
        link: "rounded-lg",
        nav: "left",
        offset: `${FLOAT} top-3 max-w-none px-3`,
      }
    ),
  ],
};

const OFFSET: HeaderFamily = {
  description: "How far the bar floats from the top edge.",
  name: "Offset",
  presets: [
    preset(
      "offset-flush",
      "Touching",
      "Inngest",
      "Rounded, but resting against the very top of the page.",
      {
        bar: "rounded-b-2xl border border-alpha-8 border-t-0 bg-card/80 backdrop-blur-xl dark:bg-muted/75",
        cta: "raised",
        inner: "h-14 gap-6 px-4",
        link: "rounded-lg",
        nav: "left",
        offset: `${FLOAT} top-0 max-w-[1200px] px-5`,
      }
    ),
    preset(
      "offset-8",
      "8px",
      "Clerk",
      "Just enough of a gap to read as detached.",
      {
        bar: "rounded-xl border border-alpha-8 bg-card/80 backdrop-blur-xl dark:bg-muted/75",
        cta: "raised",
        inner: "h-13 gap-6 px-4",
        link: "rounded-lg",
        nav: "left",
        offset: `${FLOAT} top-2 max-w-[1200px] px-5`,
      }
    ),
    preset(
      "offset-24",
      "24px",
      "Modal",
      "The offset Modal ships, and the one that reads most deliberate.",
      {
        bar: "rounded-full border border-alpha-8 bg-card/80 backdrop-blur-xl dark:bg-muted/75",
        cta: "raised",
        inner: "h-12 gap-8 px-2.5 pl-5",
        link: "rounded-full",
        nav: "centre",
        offset: `${FLOAT} top-6 max-w-[1200px] px-5`,
      }
    ),
    preset(
      "offset-40",
      "40px",
      "Modal",
      "Floating well clear, letting the artwork run underneath.",
      {
        bar: "rounded-full border border-alpha-8 bg-card/80 backdrop-blur-xl dark:bg-muted/75",
        cta: "raised",
        inner: "h-12 gap-8 px-2.5 pl-5",
        link: "rounded-full",
        nav: "centre",
        offset: `${FLOAT} top-10 max-w-[1200px] px-5`,
      }
    ),
    preset(
      "offset-banner",
      "Below a banner",
      "Inngest",
      "Offset far enough to clear an announcement strip.",
      {
        bar: "rounded-xl border border-alpha-8 bg-card/80 backdrop-blur-xl dark:bg-muted/75",
        cta: "raised",
        inner: "h-12 gap-6 px-4",
        link: "rounded-lg",
        nav: "left",
        offset: `${FLOAT} top-14 max-w-[1200px] px-5`,
      }
    ),
  ],
};

const HYBRID: HeaderFamily = {
  description:
    "Mintlify’s outlined sign-in and centred nav, crossed with Inngest’s slab and Vercel’s shadow hairline.",
  name: "Hybrids",
  presets: [
    preset(
      "hybrid-flush",
      "Flush, outlined pair",
      "Mintlify + Vercel",
      "Centred nav, shadow hairline, and a bordered sign-in beside the solid CTA.",
      {
        bar: "w-full bg-background/90 shadow-[0_1px_0_color-mix(in_oklch,var(--foreground)_14%,transparent)] backdrop-blur-md",
        cta: "raised",
        inner: "mx-auto h-16 max-w-[1280px] gap-8 px-6",
        link: "rounded-md",
        nav: "centre",
        offset: "sticky top-0 z-50 w-full",
        signIn: "outline",
      }
    ),
    preset(
      "hybrid-slab",
      "Slab, outlined pair",
      "Mintlify + Inngest",
      "Inngest’s detached slab carrying Mintlify’s button pairing.",
      {
        bar: "rounded-md border border-alpha-8 bg-card/85 shadow-sm backdrop-blur-lg dark:bg-muted/80",
        cta: "raised",
        inner: "h-14 gap-8 px-3",
        link: "rounded-md",
        nav: "centre",
        offset: `${FLOAT} top-4 max-w-[1392px] px-6`,
        signIn: "outline",
      }
    ),
    preset(
      "hybrid-slab-left",
      "Slab, left nav",
      "Inngest + Vercel",
      "The slab with links packed beside the mark and a shadow hairline beneath.",
      {
        bar: "rounded-md bg-card/90 shadow-[0_1px_0_color-mix(in_oklch,var(--foreground)_12%,transparent),0_8px_24px_-12px_rgb(0_0_0/0.4)] backdrop-blur-lg dark:bg-muted/85",
        cta: "raised",
        inner: "h-14 gap-8 px-4",
        link: "rounded-md",
        nav: "left",
        offset: `${FLOAT} top-4 max-w-[1320px] px-6`,
        signIn: "outline",
      }
    ),
    preset(
      "hybrid-tall",
      "Tall, outlined pair",
      "Mintlify",
      "A 64px slab with generous gaps, closest to the reference.",
      {
        bar: "rounded-lg border border-alpha-8 bg-card/85 backdrop-blur-lg dark:bg-muted/85",
        cta: "raised",
        inner: "h-16 gap-10 px-4",
        link: "rounded-md",
        nav: "centre",
        offset: `${FLOAT} top-3 max-w-[1440px] px-6`,
        signIn: "outline",
      }
    ),
    preset(
      "hybrid-capsule",
      "Capsule, outlined pair",
      "Mintlify + Modal",
      "The button pairing carried into a floating pill.",
      {
        bar: "rounded-full border border-alpha-8 bg-card/85 backdrop-blur-xl dark:bg-muted/80",
        cta: "raised",
        inner: "h-14 gap-8 px-2.5 pl-6",
        link: "rounded-full",
        nav: "centre",
        offset: `${FLOAT} top-5 max-w-[1240px] px-5`,
        signIn: "outline",
      }
    ),
  ],
};

/* Measured from vercel.com: pure black page, a 14%-white hairline drawn as a
   box-shadow so it never affects layout, and #0a0a0a controls ringed in #2e2e2e. */
const INK = "bg-[#0a0a0a]";
const RING = "shadow-[0_0_0_1px_#2e2e2e]";
const HAIRLINE = "shadow-[0_1px_0_rgb(255_255_255/0.14)]";

const VERCEL_FAMILY: HeaderFamily = {
  description:
    "Vercel’s near-black palette: #0a0a0a surfaces, #2e2e2e rings and a 14% white hairline.",
  name: "Vercel ink",
  presets: [
    preset(
      "ink-flush",
      "Ink, flush",
      "Vercel",
      "Pure black bar with the hairline drawn as a shadow rather than a border.",
      {
        bar: `w-full border-0 bg-black ${HAIRLINE}`,
        cta: "raised",
        inner: "mx-auto h-16 max-w-[1448px] gap-8 px-6",
        link: "rounded-md",
        nav: "left",
        offset: "sticky top-0 z-50 w-full",
        signIn: "vercel",
      }
    ),
    preset(
      "ink-slab",
      "Ink slab",
      "Vercel + Inngest",
      "The same ink on a detached slab, ringed at #2e2e2e.",
      {
        bar: `rounded-md border-0 ${INK} ${RING}`,
        cta: "raised",
        inner: "h-14 gap-8 px-4",
        link: "rounded-md",
        nav: "centre",
        offset: `${FLOAT} top-4 max-w-[1392px] px-6`,
        signIn: "vercel",
      }
    ),
    preset(
      "ink-capsule",
      "Ink capsule",
      "Vercel + Modal",
      "A near-black pill, ring instead of border, no blur.",
      {
        bar: `rounded-full border-0 ${INK} ${RING}`,
        cta: "raised",
        inner: "h-12 gap-8 px-2.5 pl-6",
        link: "rounded-full",
        nav: "centre",
        offset: `${FLOAT} top-6 max-w-[1240px] px-5`,
        signIn: "vercel",
      }
    ),
    preset(
      "ink-card",
      "Ink card",
      "Vercel + Clerk",
      "Ink surface with a soft drop beneath, so it lifts off the artwork.",
      {
        bar: `rounded-xl border-0 ${INK} shadow-[0_0_0_1px_#2e2e2e,0_12px_40px_-16px_rgb(0_0_0/0.8)]`,
        cta: "raised",
        inner: "h-14 gap-8 px-4",
        link: "rounded-md",
        nav: "left",
        offset: `${FLOAT} top-5 max-w-[1280px] px-6`,
        signIn: "vercel",
      }
    ),
    preset(
      "ink-morph",
      "Ink, collapsing",
      "Vercel + Prisma",
      "Transparent until you scroll, then the ink and its ring appear.",
      {
        bar: `rounded-full border-0 ${INK} ${RING}`,
        chrome: "morph",
        cta: "raised",
        inner: "h-12 gap-8 px-2.5 pl-6",
        link: "rounded-full",
        nav: "centre",
        offset: `${FLOAT} top-4 max-w-[1080px] px-5`,
        signIn: "vercel",
      }
    ),
  ],
};

/* The Ink card shape with its #2e2e2e ring re-tinted. Each keeps Vercel’s
   near-black value and moves only the hue, so the bar stays darker than the page. */
const INK_TINTS: HeaderFamily = {
  description:
    "The Ink card at 59, held at Vercel’s near-black value with the hue moved.",
  name: "Ink colourways",
  presets: [
    preset(
      "ink-slate",
      "Slate",
      "Linear",
      "A cool blue-grey cast, closest to our own dark surfaces.",
      {
        bar: "rounded-xl border-0 bg-[#0b0d10] shadow-[0_0_0_1px_#2a2f36,0_12px_40px_-16px_rgb(0_0_0/0.8)]",
        cta: "raised",
        inner: "h-14 gap-8 px-4",
        link: "rounded-md",
        nav: "left",
        offset: `${FLOAT} top-5 max-w-[1280px] px-6`,
        signIn: "vercel",
      }
    ),
    preset(
      "ink-indigo",
      "Indigo",
      "Clerk",
      "A violet lean that reads richer under the dither.",
      {
        bar: "rounded-xl border-0 bg-[#0b0a12] shadow-[0_0_0_1px_#2f2a3d,0_12px_40px_-16px_rgb(0_0_0/0.8)]",
        cta: "raised",
        inner: "h-14 gap-8 px-4",
        link: "rounded-md",
        nav: "left",
        offset: `${FLOAT} top-5 max-w-[1280px] px-6`,
        signIn: "vercel",
      }
    ),
    preset(
      "ink-forest",
      "Forest",
      "Mintlify",
      "A green cast picked from the Mintlify mark.",
      {
        bar: "rounded-xl border-0 bg-[#080d0a] shadow-[0_0_0_1px_#263029,0_12px_40px_-16px_rgb(0_0_0/0.8)]",
        cta: "raised",
        inner: "h-14 gap-8 px-4",
        link: "rounded-md",
        nav: "left",
        offset: `${FLOAT} top-5 max-w-[1280px] px-6`,
        signIn: "vercel",
      }
    ),
    preset(
      "ink-umber",
      "Umber",
      "Cursor",
      "A warm brown-black, the only tint that reads warm.",
      {
        bar: "rounded-xl border-0 bg-[#0d0b09] shadow-[0_0_0_1px_#332c26,0_12px_40px_-16px_rgb(0_0_0/0.8)]",
        cta: "raised",
        inner: "h-14 gap-8 px-4",
        link: "rounded-md",
        nav: "left",
        offset: `${FLOAT} top-5 max-w-[1280px] px-6`,
        signIn: "vercel",
      }
    ),
    preset(
      "ink-plum",
      "Plum",
      "Convex",
      "A red-violet cast, the strongest hue of the set.",
      {
        bar: "rounded-xl border-0 bg-[#100a0d] shadow-[0_0_0_1px_#3a2a32,0_12px_40px_-16px_rgb(0_0_0/0.8)]",
        cta: "raised",
        inner: "h-14 gap-8 px-4",
        link: "rounded-md",
        nav: "left",
        offset: `${FLOAT} top-5 max-w-[1280px] px-6`,
        signIn: "vercel",
      }
    ),
    preset(
      "ink-teal",
      "Teal",
      "e2b",
      "A cyan lean that sits closest to our primary.",
      {
        bar: "rounded-xl border-0 bg-[#080e10] shadow-[0_0_0_1px_#243238,0_12px_40px_-16px_rgb(0_0_0/0.8)]",
        cta: "raised",
        inner: "h-14 gap-8 px-4",
        link: "rounded-md",
        nav: "left",
        offset: `${FLOAT} top-5 max-w-[1280px] px-6`,
        signIn: "vercel",
      }
    ),
  ],
};

export const HEADER_FAMILIES: readonly HeaderFamily[] = [
  CAPSULE,
  CARD,
  GLASS,
  BEHAVIOUR,
  STRUCTURE,
  COLOUR,
  FLUSH,
  COMPACT,
  WIDTH,
  OFFSET,
  HYBRID,
  VERCEL_FAMILY,
  INK_TINTS,
];

export const HEADER_PRESETS: readonly HeaderPreset[] = HEADER_FAMILIES.flatMap(
  (family) => family.presets
);

export const CURRENT_HEADER: HeaderPreset = preset(
  "current",
  "Current",
  "Linear",
  "A cool blue-grey cast, closest to our own dark surfaces.",
  {
    bar: "rounded-xl border-0 bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.08),0_12px_40px_-16px_rgb(0_0_0/0.18)] dark:bg-[#0b0d10] dark:shadow-[0_0_0_1px_#2a2f36,0_12px_40px_-16px_rgb(0_0_0/0.8)]",
    cta: "raised",
    inner: "h-14 gap-8 px-4",
    link: "rounded-md",
    nav: "left",
    offset: `${FLOAT} top-5 max-w-3xl px-6`,
    signIn: "vercel",
  }
);

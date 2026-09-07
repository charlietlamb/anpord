import type { ComponentProps } from "react";

const INITIAL_LOGOS = [
  {
    name: "Bloom",
    family: "Organic",
    path: "M0-15C-23-29-16-48 0-43C16-48 23-29 0-15Z",
  },
  {
    name: "Seed",
    family: "Organic",
    path: "M-4-16C-23-29-10-48 9-43C19-26 8-16-4-16Z",
  },
  {
    name: "Petal",
    family: "Organic",
    path: "M0-14C-20-23-17-39 0-46C17-39 20-23 0-14Z",
  },
  {
    name: "Clover",
    family: "Organic",
    path: "M0-15C-8-20-17-27-17-35A10 10 0 0 1 0-42A10 10 0 0 1 17-35C17-27 8-20 0-15Z",
  },
  {
    name: "Sprout",
    family: "Organic",
    path: "M-5-16C-20-29-14-43 11-44C17-21 5-15-5-16Z",
  },
  {
    name: "Pebble",
    family: "Organic",
    path: "M-12-22Q-20-27-13-38Q-7-49 7-43Q20-38 14-28Q8-17-12-22Z",
  },
  {
    name: "Vortex",
    family: "Motion",
    path: "M-5-15C-8-32 3-46 22-38C9-37 8-24 8-17Z",
  },
  {
    name: "Turbine",
    family: "Motion",
    path: "M-7-16L-13-37Q2-48 20-39L7-30L6-17Z",
  },
  {
    name: "Current",
    family: "Motion",
    path: "M-9-17C-22-29-9-48 13-42L18-33C0-38-6-26 1-18Z",
  },
  {
    name: "Sail",
    family: "Motion",
    path: "M-7-15L-13-42Q7-44 21-32Q4-33-7-15Z",
  },
  {
    name: "Drift",
    family: "Motion",
    path: "M-9-18Q-19-37 5-44L17-36Q-5-34 2-18Z",
  },
  {
    name: "Propel",
    family: "Motion",
    path: "M-5-14L-9-35Q-10-44 0-44H15Q21-44 18-37L6-15Z",
  },
  {
    name: "Facet",
    family: "Structure",
    path: "M-7-18L-17-35L0-45L17-35L7-18Z",
  },
  { name: "Prism", family: "Structure", path: "M-3-15L-17-34L4-45L17-26Z" },
  { name: "Keystone", family: "Structure", path: "M-9-22L-17-39L17-39L9-22Z" },
  {
    name: "Chevron",
    family: "Structure",
    path: "M-19-34L0-45L19-34L13-24L0-32L-13-24Z",
  },
  { name: "Fold", family: "Structure", path: "M-13-20V-42H9L19-31H0V-20Z" },
  { name: "Crystal", family: "Structure", path: "M0-16L-13-31L0-46L13-31Z" },
  {
    name: "Orbit",
    family: "Circular",
    path: "M-17.08-36.63A40.42 40.42 0 0 1 17.08-36.63L11.16-23.93A26.4 26.4 0 0 0-11.16-23.93Z",
  },
  {
    name: "Satellite",
    family: "Circular",
    path: "M-12-32A12 12 0 1 1 12-32A12 12 0 1 1-12-32Z",
  },
  {
    name: "Capsule",
    family: "Circular",
    path: "M-7-23V-38A7 7 0 0 1 7-38V-23A7 7 0 0 1-7-23Z",
  },
  {
    name: "Halo",
    family: "Circular",
    path: "M-12-36Q0-42 12-36Q18-33 13-28Q0-34-13-28Q-18-33-12-36Z",
  },
  { name: "Pulse", family: "Circular", path: "M-5-15V-43H5V-15Z" },
  {
    name: "Ripple",
    family: "Circular",
    path: "M-18-37Q0-47 18-37L14-30Q0-38-14-30ZM-11-25Q0-31 11-25L7-18Q0-22-7-18Z",
  },
  {
    name: "Loop",
    family: "Openwork",
    path: "M0-15C-24-28-17-47 0-44C17-47 24-28 0-15ZM0-24C11-32 10-38 0-36C-10-38-11-32 0-24Z",
  },
  {
    name: "Link",
    family: "Openwork",
    path: "M-12-25V-35A12 12 0 0 1 12-35V-25A12 12 0 0 1-12-25ZM-5-25A5 5 0 0 0 5-25V-35A5 5 0 0 0-5-35Z",
  },
  {
    name: "Portal",
    family: "Openwork",
    path: "M-15-21V-35Q-15-46 0-46Q15-46 15-35V-21H7V-34Q7-38 0-38Q-7-38-7-34V-21Z",
  },
  {
    name: "Lattice",
    family: "Openwork",
    path: "M0-15L-17-31L0-47L17-31ZM0-25L7-31L0-37L-7-31Z",
  },
  {
    name: "Aperture",
    family: "Openwork",
    path: "M-16-35L0-45L17-35L9-21L2-25L7-32L0-36L-5-33L2-20L-5-16Z",
  },
  {
    name: "Continuum",
    family: "Openwork",
    path: "M-13-20V-36Q-13-45-4-45H9Q18-45 18-36V-30H10V-35Q10-37 8-37H-3Q-5-37-5-35V-20Z",
  },
] as const;

const MOTION_STRUCTURE_LOGOS = [
  {
    name: "Swirl",
    family: "Motion",
    path: "M-5-13C-19-28-6-47 18-42C0-37-3-26 5-17Z",
  },
  {
    name: "Helix",
    family: "Motion",
    path: "M-8-16C6-26-17-33-7-44L8-44C-3-31 19-25 3-15Z",
  },
  {
    name: "Slipstream",
    family: "Motion",
    path: "M-10-18C-22-32-4-48 18-39L14-34C-2-42-13-28-5-22ZM0-23C-6-31 2-35 11-30L8-25Q3-29 4-24Z",
  },
  {
    name: "Cyclone",
    family: "Motion",
    path: "M-6-12C-22-29-8-49 19-40C1-43-11-27 5-18Z",
  },
  {
    name: "Impeller",
    family: "Motion",
    path: "M-5-16L-16-36Q0-47 19-38L6-29L7-18Z",
  },
  {
    name: "Gyre",
    family: "Motion",
    path: "M-7-17C-18-20-19-37-8-41C1-46 11-41 18-34L10-28C3-36-4-37-7-32C-10-26-2-24 3-25L4-18Q-2-15-7-17Z",
  },
  {
    name: "Wake",
    family: "Motion",
    path: "M-11-18L-17-33Q-4-46 16-40L20-32Q-1-39-11-18Z",
  },
  {
    name: "Torque",
    family: "Motion",
    path: "M-8-15L-15-34Q-16-38-12-40L1-46L18-35L7-32L-1-37L0-26L5-19Z",
  },
  {
    name: "Sweep",
    family: "Motion",
    path: "M-8-18Q-19-35-5-44Q-1-47 3-43L16-31Q19-28 14-25L3-20Q-1-29-8-18Z",
  },
  {
    name: "Ribbon",
    family: "Motion",
    path: "M-12-21V-34Q-12-44-2-44H15L8-35H1Q-3-35-3-31V-16ZM1-31H10L4-21H1Z",
  },
  {
    name: "Flare",
    family: "Motion",
    path: "M-5-13Q-4-34-16-39Q3-50 19-35Q5-34 4-17Z",
  },
  {
    name: "Flux",
    family: "Motion",
    path: "M-10-18Q-21-31-10-41Q-1-48 14-39L17-30Q3-40-5-32Q-9-26 0-22Z",
  },
  {
    name: "Ratchet",
    family: "Structure",
    path: "M-11-20L-17-36L0-46L18-35L6-35L-2-39L-6-36L3-21Z",
  },
  {
    name: "Dovetail",
    family: "Structure",
    path: "M-8-18L-17-40H-5L0-32L5-40H17L8-18Z",
  },
  { name: "Monolith", family: "Structure", path: "M-7-17L-13-40L5-45L14-22Z" },
  { name: "Wedge", family: "Structure", path: "M-6-17L-19-37L17-37Z" },
  {
    name: "Tessera",
    family: "Structure",
    path: "M-15-33L0-44L15-33L0-24ZM-9-24L0-18L9-24L0-12Z",
  },
  {
    name: "Bracket",
    family: "Structure",
    path: "M-13-23V-39L0-46L15-37L10-29L0-35L-4-33V-23Z",
  },
  {
    name: "Crown",
    family: "Structure",
    path: "M-9-21L-17-36L-7-33L0-46L7-33L17-36L9-21Z",
  },
  {
    name: "Junction",
    family: "Structure",
    path: "M-5-17V-29L-16-35L-11-43L0-36L11-43L16-35L5-29V-17Z",
  },
  { name: "Arrowhead", family: "Structure", path: "M-13-39L14-35L3-13L-1-28Z" },
  { name: "Segment", family: "Structure", path: "M-16-37L0-44L16-37L9-24H-9Z" },
  {
    name: "Triad",
    family: "Structure",
    path: "M0-45L16-32L6-19H-6L-16-32ZM0-36L-5-27H5Z",
  },
  {
    name: "Vault",
    family: "Structure",
    path: "M-14-24V-36L0-45L14-36V-24H6V-32L0-36L-6-32V-24Z",
  },
] as const;

const EXPERIMENTAL_LOGOS = [
  {
    name: "Parallax",
    family: "Experimental",
    path: "M-14-26L-5-44L16-34L7-16ZM-5-27L0-35L7-31L2-23Z",
    angles: [0, 48, 120, 168, 240, 288],
  },
  {
    name: "Moire",
    family: "Experimental",
    path: "M-18-35Q0-49 18-35L15-31Q0-43-15-31ZM-14-27Q0-38 14-27L11-23Q0-32-11-23ZM-9-19Q0-26 9-19L6-15Q0-20-6-15Z",
  },
  {
    name: "Mobius",
    family: "Experimental",
    path: "M-7-10C-26-22-23-45-5-45C12-45 23-24 11-16L5-22C12-29 5-37-3-37C-14-37-15-23 0-16Z",
  },
  {
    name: "Glitch",
    family: "Experimental",
    path: "M-13-42H8V-34H-13ZM-4-31H17V-23H-4ZM-8-20H5V-12H-8Z",
  },
  {
    name: "Shutter",
    family: "Experimental",
    path: "M-3-9L-21-34L-5-44L17-32L6-30L-3-35L-10-31L5-14Z",
  },
  {
    name: "Singularity",
    family: "Experimental",
    path: "M-2-5C-6-21-23-23-17-37C-12-49 6-46 14-34C-4-44-14-29-3-19L4-9Z",
  },
  {
    name: "Quasar",
    family: "Experimental",
    path: "M-3-12L-11-43L0-34L12-45L7-27L17-25L4-18Z",
  },
  {
    name: "Weave",
    family: "Experimental",
    path: "M-16-26V-38L-3-46L17-34L12-27L-3-36L-8-33V-26ZM-8-22H0V-30L7-26V-16H-8Z",
  },
  {
    name: "Anvil",
    family: "Experimental",
    path: "M-17-39H17L8-30V-25L13-20H-13L-8-25V-30Z",
  },
  {
    name: "Rosette",
    family: "Experimental",
    path: "M0-8C-5-23-26-24-18-39C-10-52 6-42 6-32C20-31 18-19 8-17C3-16 1-12 0-8ZM-7-31A4 4 0 1 0-7-39A4 4 0 1 0-7-31Z",
  },
  {
    name: "Offset",
    family: "Experimental",
    path: "M-6-20V-39Q-6-45 0-45H7Q13-45 13-39V-20Z",
    angles: [0, 42, 105, 180, 222, 285],
  },
  {
    name: "Arcology",
    family: "Experimental",
    path: "M-18-36L0-46L18-36V-29L0-39L-18-29ZM-11-26L0-32L11-26V-19L0-25L-11-19ZM-4-15L0-18L4-15V-10H-4Z",
  },
  {
    name: "Fracture",
    family: "Experimental",
    path: "M-15-37L6-45L1-28L-8-20ZM10-41L20-32L5-18L7-30Z",
  },
  {
    name: "Wormhole",
    family: "Experimental",
    path: "M-13-17C-26-30-15-47 3-45C19-43 23-28 10-22L6-28C13-32 10-39 2-39C-8-39-15-31-7-23ZM-3-24Q-10-30-2-34Q4-36 7-31L2-28Z",
  },
  {
    name: "Splice",
    family: "Experimental",
    path: "M-14-21V-43H-5V-30H2V-21ZM0-43H17V-34H9V-18H0Z",
  },
  {
    name: "Echo",
    family: "Experimental",
    path: "M-4-46H4V-34H-4ZM-6-29H6V-19H-6ZM-3-14H3V-8H-3Z",
  },
  {
    name: "Asterisk",
    family: "Experimental",
    path: "M-4-7L-8-36Q-9-45 0-45Q9-45 8-36L4-7Z",
  },
  {
    name: "Metamorph",
    family: "Experimental",
    path: "M-9-17L-16-34Q-18-42-8-44H8Q18-42 16-34L9-17L0-25ZM0-32A3 3 0 1 0 0-38A3 3 0 1 0 0-32Z",
  },
] as const;

const ANVIL_LOGOS = [
  {
    name: "Anvil Slim",
    family: "Anvil",
    path: "M-18-40H18L5-29V-26L11-20H-11L-5-26V-29Z",
  },
  {
    name: "Anvil Heavy",
    family: "Anvil",
    path: "M-18-40H18L11-31V-27L14-21H-14L-11-27V-31Z",
  },
  {
    name: "Anvil Tall",
    family: "Anvil",
    path: "M-15-46H15L5-31V-24L9-16H-9L-5-24V-31Z",
  },
  {
    name: "Anvil Compact",
    family: "Anvil",
    path: "M-16-36H16L7-29L12-22H-12L-7-29Z",
  },
  {
    name: "Anvil Soft",
    family: "Anvil",
    path: "M-14-40H14Q18-40 15-36L9-30Q6-27 9-24L11-22Q14-19 10-19H-10Q-14-19-11-22L-9-24Q-6-27-9-30L-15-36Q-18-40-14-40Z",
  },
  {
    name: "Anvil Chamfer",
    family: "Anvil",
    path: "M-13-42H13L18-37L8-29V-26L12-22L9-19H-9L-12-22L-8-26V-29L-18-37Z",
  },
  {
    name: "Anvil Split",
    family: "Anvil",
    path: "M-17-40H-2V-20H-12L-7-26V-30ZM2-40H17L7-30V-26L12-20H2Z",
  },
  {
    name: "Anvil Hollow",
    family: "Anvil",
    path: "M-18-41H18L9-30V-26L13-20H-13L-9-26V-30ZM-7-35L-3-29V-26H3V-29L7-35Z",
  },
  {
    name: "Anvil Lean",
    family: "Anvil",
    path: "M-18-38L13-44L6-31L8-26L15-22L-9-18L-6-25L-8-30Z",
  },
  {
    name: "Anvil Notch",
    family: "Anvil",
    path: "M-18-41H-5L0-34L5-41H18L8-30V-26L12-20H-12L-8-26V-30Z",
  },
  {
    name: "Anvil Bow",
    family: "Anvil",
    path: "M-17-41H17Q2-30 12-20H-12Q-2-30-17-41Z",
  },
  {
    name: "Anvil Bridge",
    family: "Anvil",
    path: "M-18-40H18L10-31V-20H4V-29H-4V-20H-10V-31Z",
  },
] as const;

export const LATEST_LOGOS = [
  {
    name: "Anvil Heavy Solid",
    family: "Anvil",
    path: "M-18-42H18L12-33V-27L13-22H-13L-12-27V-33Z",
  },
  {
    name: "Anvil Heavy Wide",
    family: "Anvil",
    path: "M-20-40H20L12-32V-29L15-25H-15L-12-29V-32Z",
  },
  {
    name: "Anvil Heavy Inset",
    family: "Anvil",
    path: "M-18-42H18L10-33V-18H-10V-33Z",
  },
  {
    name: "Anvil Heavy Block",
    family: "Anvil",
    path: "M-17-42H17V-37L11-31V-26L13-22H-13L-11-26V-31L-17-37Z",
  },
  {
    name: "Anvil Heavy Taper",
    family: "Anvil",
    path: "M-19-42H19L12-33L10-28L12-20H-12L-10-28L-12-33Z",
  },
  {
    name: "Anvil Heavy Round",
    family: "Anvil",
    path: "M-15-41H15Q19-41 17-37L12-32Q10-30 11-27L13-23Q14-21 11-21H-11Q-14-21-13-23L-11-27Q-10-30-12-32L-17-37Q-19-41-15-41Z",
  },
  {
    name: "Anvil Chamfer Bold",
    family: "Anvil",
    path: "M-13-43H13L19-37L11-30V-26L13-23L10-20H-10L-13-23L-11-26V-30L-19-37Z",
  },
  {
    name: "Anvil Chamfer Deep",
    family: "Anvil",
    path: "M-9-44H9L19-34L9-28L13-23L8-18H-8L-13-23L-9-28L-19-34Z",
  },
  {
    name: "Anvil Chamfer Square",
    family: "Anvil",
    path: "M-14-42H14L18-38V-35L10-30V-26L13-23V-20H-13V-23L-10-26V-30L-18-35V-38Z",
  },
  {
    name: "Anvil Chamfer Narrow",
    family: "Anvil",
    path: "M-11-43H11L17-37L7-30V-25L11-21L8-18H-8L-11-21L-7-25V-30L-17-37Z",
  },
  {
    name: "Anvil Chamfer Cut",
    family: "Anvil",
    path: "M-13-43H13L18-38L13-32H10V-26L13-23L10-20H-10L-13-23L-10-26V-32H-13L-18-38Z",
  },
  {
    name: "Anvil Chamfer Soft",
    family: "Anvil",
    path: "M-12-42H12L17-37Q18-36 16-34L10-29V-26L12-23Q13-22 11-20H-11Q-13-22-12-23L-10-26V-29L-16-34Q-18-36-17-37Z",
  },
] as const;

export const LOGOS = [
  ...INITIAL_LOGOS,
  ...MOTION_STRUCTURE_LOGOS,
  ...EXPERIMENTAL_LOGOS,
  ...ANVIL_LOGOS,
  ...LATEST_LOGOS,
];

export type LogoOption = (typeof LOGOS)[number];

const ROTATIONS = [0, 60, 120, 180, 240, 300];

function logoAngles(logo: LogoOption) {
  return "angles" in logo ? logo.angles : ROTATIONS;
}

export function LogoMark({
  logo,
  ...props
}: ComponentProps<"svg"> & { logo: LogoOption }) {
  return (
    <svg
      fill="currentColor"
      role="img"
      viewBox="-56 -56 112 112"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>{`${logo.name} — Anpord logo concept`}</title>
      {logoAngles(logo).map((angle) => (
        <path
          d={logo.path}
          fillRule="evenodd"
          key={angle}
          transform={`rotate(${angle})`}
        />
      ))}
    </svg>
  );
}

export function logoDownload(logo: LogoOption) {
  const paths = logoAngles(logo)
    .map((angle) => `<path d="${logo.path}" transform="rotate(${angle})"/>`)
    .join("");
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-56 -56 112 112" fill="currentColor" fill-rule="evenodd"><title>Anpord ${logo.name}</title>${paths}</svg>`)}`;
}

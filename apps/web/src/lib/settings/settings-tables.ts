export const MEMBERS_TABLE = {
  columns: "minmax(0,1fr) 6rem 7rem",
  headings: ["Member", "Role", "Joined"],
  label: "Members",
} as const;

export const INVITATIONS_TABLE = {
  columns: "minmax(0,1fr) 6rem 7rem",
  headings: ["Email", "Role", "Expires"],
  label: "Pending invitations",
} as const;

export const API_KEYS_TABLE = {
  columns: "minmax(0,1fr) 8rem 7rem 1.5rem",
  headings: ["Name", "Key", "Created"],
  label: "API keys",
} as const;

export const CONNECTIONS_TABLE = {
  columns: "minmax(0,1fr) minmax(0,10rem) 7rem minmax(0,9rem) 7rem 1.5rem",
  headings: ["Name", "Method", "Available to", "Status", "Last used"],
  label: "Connections",
} as const;

export const CHANNELS_TABLE = {
  columns: "minmax(0,1fr) 7rem 1.5rem",
  headings: ["Channel", "Prompts"],
  label: "Channels",
} as const;

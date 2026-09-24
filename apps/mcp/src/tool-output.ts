export const text = (value: string) => ({
  content: [{ text: value, type: "text" as const }],
});

export const asJson = (value: unknown) => text(JSON.stringify(value, null, 2));

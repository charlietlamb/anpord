export const slug = (value: string, fallback: string) => {
  const cleaned = value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");

  return cleaned === "" ? fallback : cleaned;
};

export const distinct = (handles: readonly string[]) =>
  handles.map((handle, index) =>
    handles.indexOf(handle) === index ? handle : `${handle}-${index + 1}`
  );

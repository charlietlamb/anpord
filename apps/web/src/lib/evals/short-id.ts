const RUN_PREFIX = /^run_/;

export const shortId = (id: string) => id.replace(RUN_PREFIX, "").slice(0, 6);

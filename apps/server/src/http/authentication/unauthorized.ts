import { Unauthorized } from "@sphynx/schema/domain/errors";

export const unauthorized = (message: string) => new Unauthorized({ message });

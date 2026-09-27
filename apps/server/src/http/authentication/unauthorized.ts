import { Unauthorized } from "@anpord/schema/domain/errors";

export const unauthorized = (message: string) => new Unauthorized({ message });

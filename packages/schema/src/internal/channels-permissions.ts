import type { Permission } from "../domain/permissions";
import { Permissions } from "../domain/permissions";
import type { ChannelsGroup } from "./channels-api";
import type { EndpointName } from "./endpoint-name";

export const CHANNEL_PERMISSIONS: Record<
  EndpointName<typeof ChannelsGroup>,
  Permission
> = {
  list: Permissions.Channels.Read,
  create: Permissions.Channels.Write,
  update: Permissions.Channels.Write,
  /** A channel is deleted outright rather than archived, so unlike a prompt
   * there is nothing to restore afterwards. */
  remove: Permissions.Organization.Admin,
};

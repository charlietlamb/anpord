import { Actor, OrganizationId, UserId } from "@anpord/schema/domain/actor";

export const systemActor = (organizationId: string) =>
  Actor.make({
    id: UserId.make(organizationId),
    organizationId: OrganizationId.make(organizationId),
    isUser: false,
    permissions: [],
  });

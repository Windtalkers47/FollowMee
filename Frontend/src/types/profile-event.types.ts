export interface UserProfileUpdatedEvent {
  eventId: string;
  userId: number;
  actorUserId: number;
  userName: string;
  userLastName: string;
  userImageUrl: string | null;
  updatedAt: string;
}

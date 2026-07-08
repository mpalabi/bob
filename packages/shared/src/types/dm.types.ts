import type { UserWithPresence } from './user.types';

/** A 1:1 direct message between two users. */
export interface DirectMessage {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
  readAt?: string | null;
}

/** A DM thread with another user, used for the conversations list. */
export interface DmConversation {
  user: UserWithPresence;
  lastMessage?: DirectMessage;
  unreadCount: number;
}

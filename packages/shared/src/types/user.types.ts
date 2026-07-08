export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: string;
}

export type UserPresence = 'online' | 'away' | 'busy' | 'offline';

export interface UserWithPresence extends User {
  presence: UserPresence;
}

/** Returned by POST /auth/register and POST /auth/login. */
export interface AuthResponse {
  accessToken: string;
  user: UserWithPresence;
}

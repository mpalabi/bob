// Org → Workspace → Team hierarchy. Each level has its own members + invites.

export type MemberRole = 'owner' | 'admin' | 'member';

export type InviteStatus = 'pending' | 'accepted' | 'expired';

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  /** Email domain bound to the org (e.g. "acme.com"), or null for personal orgs. */
  domain: string | null;
  avatarUrl?: string | null;
  createdById: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface Team {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  avatarUrl?: string | null;
  createdAt: string;
}

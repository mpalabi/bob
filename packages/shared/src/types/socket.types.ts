import type { Message } from './chat.types';
import type { DirectMessage } from './dm.types';
import type { Task, Project } from './task.types';
import type { UserPresence } from './user.types';

export interface ServerToClientEvents {
  'chat:message': (message: Message) => void;
  'chat:message:updated': (message: Message) => void;
  'chat:message:deleted': (messageId: string) => void;
  'dm:message': (message: DirectMessage) => void;
  'presence:update': (userId: string, presence: UserPresence) => void;
  'task:created': (task: Task) => void;
  'task:updated': (task: Task) => void;
  'task:deleted': (taskId: string) => void;
  'project:created': (project: Project) => void;
  'project:updated': (project: Project) => void;
  'project:deleted': (projectId: string) => void;
  'ai:chunk': (chunk: string) => void;
  'ai:done': () => void;
  'ai:tool_start': (payload: { id: string; name: string; input: Record<string, unknown> }) => void;
  'ai:tool_done': (payload: { id: string; name: string; result: string }) => void;
}

export interface ClientToServerEvents {
  'chat:send': (payload: { channelId: string; content: string }) => void;
  'chat:join': (channelId: string) => void;
  'chat:leave': (channelId: string) => void;
  'dm:send': (payload: { recipientId: string; content: string }) => void;
  'presence:set': (presence: UserPresence) => void;
  'task:update': (task: Partial<Task> & { id: string }) => void;
  'ai:message': (payload: { content: string; history?: Array<{ role: 'user' | 'assistant'; content: string }> }) => void;
}

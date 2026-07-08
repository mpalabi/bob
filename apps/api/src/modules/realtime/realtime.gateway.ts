import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { JwtService } from '@nestjs/jwt'
import type { DirectMessage, Task, Project, UserPresence } from '@bob/shared'
import { UsersService } from '../users/users.service'
import { DmService } from '../dm/dm.service'

// Authenticated realtime hub on the default namespace. Carries direct
// messages, presence, and task broadcasts. (AI streaming lives separately
// on the `/ai` namespace.)
@WebSocketGateway({ cors: { origin: 'http://localhost:5173', credentials: true } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server

  // How many live sockets each user has open, so presence only flips to
  // offline when the user's last tab/window disconnects.
  private connections = new Map<string, number>()

  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private dmService: DmService
  ) {}

  private userIdOf(client: Socket): string | undefined {
    return client.data?.userId
  }

  private room(userId: string): string {
    return `user:${userId}`
  }

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined
    if (!token) {
      client.disconnect()
      return
    }

    let userId: string
    try {
      const payload = this.jwtService.verify(token) as { sub: string }
      userId = payload.sub
    } catch {
      client.disconnect()
      return
    }

    client.data.userId = userId
    client.join(this.room(userId))

    const count = (this.connections.get(userId) ?? 0) + 1
    this.connections.set(userId, count)
    if (count === 1) await this.setPresence(userId, 'online')
  }

  async handleDisconnect(client: Socket) {
    const userId = this.userIdOf(client)
    if (!userId) return

    const count = (this.connections.get(userId) ?? 1) - 1
    if (count <= 0) {
      this.connections.delete(userId)
      await this.setPresence(userId, 'offline')
    } else {
      this.connections.set(userId, count)
    }
  }

  private async setPresence(userId: string, presence: UserPresence) {
    await this.usersService.updatePresence(userId, presence)
    this.server.emit('presence:update', userId, presence)
  }

  @SubscribeMessage('presence:set')
  async handlePresenceSet(@ConnectedSocket() client: Socket, @MessageBody() presence: UserPresence) {
    const userId = this.userIdOf(client)
    if (userId) await this.setPresence(userId, presence)
  }

  @SubscribeMessage('dm:send')
  async handleDm(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { recipientId: string; content: string }
  ) {
    const senderId = this.userIdOf(client)
    if (!senderId) return
    const content = payload?.content?.trim()
    if (!content || !payload.recipientId) return

    const message = await this.dmService.send(senderId, payload.recipientId, content)
    const dto = message.toJSON() as unknown as DirectMessage
    // Deliver to both ends so every open window stays in sync.
    this.server.to(this.room(payload.recipientId)).emit('dm:message', dto)
    this.server.to(this.room(senderId)).emit('dm:message', dto)
    return dto
  }

  // ─── Server-initiated broadcasts (called from REST handlers) ──────────────

  emitTaskCreated(task: Task) {
    this.server.emit('task:created', task)
  }

  emitTaskUpdated(task: Task) {
    this.server.emit('task:updated', task)
  }

  emitTaskDeleted(taskId: string) {
    this.server.emit('task:deleted', taskId)
  }

  emitProjectCreated(project: Project) {
    this.server.emit('project:created', project)
  }

  emitProjectUpdated(project: Project) {
    this.server.emit('project:updated', project)
  }

  emitProjectDeleted(projectId: string) {
    this.server.emit('project:deleted', projectId)
  }
}

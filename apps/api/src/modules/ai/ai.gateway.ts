import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { JwtService } from '@nestjs/jwt'
import { AiService } from './ai.service'

@WebSocketGateway({ namespace: '/ai', cors: { origin: 'http://localhost:5173', credentials: true } })
export class AiGateway {
  @WebSocketServer() server: Server

  constructor(
    private aiService: AiService,
    private jwtService: JwtService
  ) {}

  @SubscribeMessage('ai:message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: {
      content: string
      attachments?: Array<{ type: 'image' | 'file'; name: string; mediaType?: string; data: string }>
      history?: Array<{ role: 'user' | 'assistant'; content: string }>
    }
  ) {
    const userId = this.userIdFrom(client)

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...(payload.history ?? []),
      { role: 'user', content: payload.content }
    ]

    await this.aiService.streamMessage(
      userId,
      messages,
      chunk => client.emit('ai:chunk', chunk),
      () => client.emit('ai:done'),
      {
        onToolStart: (id, name, input) => client.emit('ai:tool_start', { id, name, input }),
        onToolDone: (id, name, result) => client.emit('ai:tool_done', { id, name, result }),
      },
      payload.attachments ?? []
    )
  }

  private userIdFrom(client: Socket): string | undefined {
    const token = client.handshake.auth?.token as string | undefined
    if (!token) return undefined
    try {
      return (this.jwtService.verify(token) as { sub: string }).sub
    } catch {
      return undefined
    }
  }
}

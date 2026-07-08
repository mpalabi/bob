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
import { ChatService } from './chat.service'

@WebSocketGateway({ namespace: '/chat', cors: { origin: 'http://localhost:5173', credentials: true } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server

  constructor(private chatService: ChatService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`)
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`)
  }

  @SubscribeMessage('chat:join')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() channelId: string) {
    client.join(channelId)
  }

  @SubscribeMessage('chat:leave')
  handleLeave(@ConnectedSocket() client: Socket, @MessageBody() channelId: string) {
    client.leave(channelId)
  }

  @SubscribeMessage('chat:send')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { channelId: string; content: string; userId: string }
  ) {
    const message = await this.chatService.createMessage(payload.channelId, payload.userId, payload.content)
    this.server.to(payload.channelId).emit('chat:message', message)
    return message
  }
}

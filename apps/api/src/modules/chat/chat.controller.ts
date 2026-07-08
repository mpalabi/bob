import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { ChatService } from './chat.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('channels')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get()
  getChannels() {
    return this.chatService.getChannels()
  }

  @Get(':id/messages')
  getMessages(@Param('id') id: string) {
    return this.chatService.getMessages(id)
  }
}

import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { DmService } from './dm.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { User } from '../users/user.model'

@UseGuards(JwtAuthGuard)
@Controller('dm')
export class DmController {
  constructor(private dmService: DmService) {}

  // List of DM threads (other user + last message + unread count).
  @Get()
  conversations(@CurrentUser() user: User) {
    return this.dmService.listConversations(user.id)
  }

  // Full history with one user; also marks their messages to me as read.
  @Get(':userId')
  async history(@CurrentUser() user: User, @Param('userId') otherId: string) {
    const messages = await this.dmService.getConversation(user.id, otherId)
    await this.dmService.markRead(user.id, otherId)
    return messages
  }

  @Post(':userId/read')
  read(@CurrentUser() user: User, @Param('userId') otherId: string) {
    return this.dmService.markRead(user.id, otherId)
  }
}

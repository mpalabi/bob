import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common'
import type { AiSettingsInput } from '@bob/shared'
import { AiSettingsService } from './ai-settings.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { User } from '../users/user.model'

@UseGuards(JwtAuthGuard)
@Controller('ai/settings')
export class AiSettingsController {
  constructor(private settings: AiSettingsService) {}

  @Get()
  get(@CurrentUser() user: User) {
    return this.settings.get(user.id)
  }

  @Put()
  put(@CurrentUser() user: User, @Body() body: AiSettingsInput) {
    return this.settings.upsert(user.id, body)
  }
}

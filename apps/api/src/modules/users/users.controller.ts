import { Controller, Get, UseGuards } from '@nestjs/common'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { User } from './user.model'

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // All other users — the people you can DM. Presence is included so the
  // contacts list can render live online/away/busy state.
  @Get()
  findAll(@CurrentUser() user: User) {
    return this.usersService.findAllExcept(user.id)
  }
}

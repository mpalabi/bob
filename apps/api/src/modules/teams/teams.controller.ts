import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { TeamsService } from './teams.service'
import { CreateTeamDto } from './dto/create-team.dto'
import { InviteMemberDto } from './dto/invite-member.dto'
import { UpdateMemberRoleDto } from './dto/update-member-role.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { User } from '../users/user.model'

@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  // Create a new team — caller becomes owner
  @Post()
  create(@Body() dto: CreateTeamDto, @CurrentUser() user: User) {
    return this.teamsService.createTeam(dto, user.id)
  }

  // Get all teams the current user belongs to
  @Get('me')
  myTeams(@CurrentUser() user: User) {
    return this.teamsService.getMyTeams(user.id)
  }

  // Get a team with its members
  @Get(':teamId')
  getTeam(@Param('teamId') teamId: string) {
    return this.teamsService.getTeam(teamId)
  }

  // List members
  @Get(':teamId/members')
  getMembers(@Param('teamId') teamId: string) {
    return this.teamsService.getMembers(teamId)
  }

  // Update a member's role (owner only)
  @Patch(':teamId/members/:memberId/role')
  updateRole(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: User
  ) {
    return this.teamsService.updateMemberRole(teamId, memberId, dto.role, user.id)
  }

  // Remove a member (owner or admin)
  @Delete(':teamId/members/:memberId')
  removeMember(
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: User
  ) {
    return this.teamsService.removeMember(teamId, memberId, user.id)
  }

  // Send an invite
  @Post(':teamId/invites')
  invite(
    @Param('teamId') teamId: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser() user: User
  ) {
    return this.teamsService.inviteMember(teamId, dto, user.id)
  }

  // List pending invites (owner or admin)
  @Get(':teamId/invites')
  getPendingInvites(@Param('teamId') teamId: string, @CurrentUser() user: User) {
    return this.teamsService.getPendingInvites(teamId, user.id)
  }

  // Revoke an invite (owner or admin)
  @Delete(':teamId/invites/:inviteId')
  revokeInvite(
    @Param('teamId') teamId: string,
    @Param('inviteId') inviteId: string,
    @CurrentUser() user: User
  ) {
    return this.teamsService.revokeInvite(teamId, inviteId, user.id)
  }

  // Accept an invite via token (any authenticated user)
  @Post('invites/:token/accept')
  acceptInvite(@Param('token') token: string, @CurrentUser() user: User) {
    return this.teamsService.acceptInvite(token, user.id, user.email)
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { WorkspacesService } from './workspaces.service'
import { CreateWorkspaceDto } from './dto/create-workspace.dto'
import { InviteMemberDto } from './dto/invite-member.dto'
import { UpdateMemberRoleDto } from './dto/update-member-role.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { User } from '../users/user.model'

@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private workspacesService: WorkspacesService) {}

  // Create a workspace under an org — caller becomes owner
  @Post()
  create(@Body() dto: CreateWorkspaceDto, @CurrentUser() user: User) {
    return this.workspacesService.createWorkspace(dto, user.id)
  }

  // Workspaces the caller belongs to
  @Get('me')
  myWorkspaces(@CurrentUser() user: User) {
    return this.workspacesService.getMyWorkspaces(user.id)
  }

  @Get(':workspaceId')
  getWorkspace(@Param('workspaceId') workspaceId: string) {
    return this.workspacesService.getWorkspace(workspaceId)
  }

  @Get(':workspaceId/members')
  getMembers(@Param('workspaceId') workspaceId: string) {
    return this.workspacesService.getMembers(workspaceId)
  }

  @Patch(':workspaceId/members/:memberId/role')
  updateRole(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: User
  ) {
    return this.workspacesService.updateMemberRole(workspaceId, memberId, dto.role, user.id)
  }

  @Delete(':workspaceId/members/:memberId')
  removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: User
  ) {
    return this.workspacesService.removeMember(workspaceId, memberId, user.id)
  }

  @Post(':workspaceId/invites')
  invite(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser() user: User
  ) {
    return this.workspacesService.inviteMember(workspaceId, dto, user.id)
  }

  @Get(':workspaceId/invites')
  getPendingInvites(@Param('workspaceId') workspaceId: string, @CurrentUser() user: User) {
    return this.workspacesService.getPendingInvites(workspaceId, user.id)
  }

  @Delete(':workspaceId/invites/:inviteId')
  revokeInvite(
    @Param('workspaceId') workspaceId: string,
    @Param('inviteId') inviteId: string,
    @CurrentUser() user: User
  ) {
    return this.workspacesService.revokeInvite(workspaceId, inviteId, user.id)
  }

  // Accept an invite via token (any authenticated user)
  @Post('invites/:token/accept')
  acceptInvite(@Param('token') token: string, @CurrentUser() user: User) {
    return this.workspacesService.acceptInvite(token, user.id, user.email)
  }
}

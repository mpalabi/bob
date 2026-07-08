import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException
} from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { randomBytes } from 'crypto'
import { Workspace } from './entities/workspace.model'
import { WorkspaceMember } from './entities/workspace-member.model'
import { WorkspaceInvite } from './entities/workspace-invite.model'
import { User } from '../users/user.model'
import { OrganizationsService } from '../organizations/organizations.service'
import { CreateWorkspaceDto } from './dto/create-workspace.dto'
import { InviteMemberDto } from './dto/invite-member.dto'

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectModel(Workspace) private workspaceModel: typeof Workspace,
    @InjectModel(WorkspaceMember) private memberModel: typeof WorkspaceMember,
    @InjectModel(WorkspaceInvite) private inviteModel: typeof WorkspaceInvite,
    private orgsService: OrganizationsService
  ) {}

  async createWorkspace(dto: CreateWorkspaceDto, ownerId: string): Promise<Workspace> {
    // The creator must belong to the parent organization.
    await this.orgsService.assertMember(dto.organizationId, ownerId)

    const slugTaken = await this.workspaceModel.findOne({
      where: { organizationId: dto.organizationId, slug: dto.slug }
    })
    if (slugTaken) throw new ConflictException('Slug already taken in this organization')

    const workspace = await this.workspaceModel.create({
      organizationId: dto.organizationId,
      name: dto.name,
      slug: dto.slug
    } as any)

    await this.memberModel.create({
      workspaceId: workspace.id,
      userId: ownerId,
      role: 'owner'
    } as any)

    return workspace
  }

  async getMyWorkspaces(userId: string): Promise<Workspace[]> {
    const memberships = await this.memberModel.findAll({
      where: { userId },
      include: [Workspace]
    })
    return memberships.map(m => m.workspace)
  }

  async getWorkspace(workspaceId: string): Promise<Workspace> {
    const workspace = await this.workspaceModel.findByPk(workspaceId, {
      include: [{ model: WorkspaceMember, include: [User] }]
    })
    if (!workspace) throw new NotFoundException('Workspace not found')
    return workspace
  }

  async getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    return this.memberModel.findAll({ where: { workspaceId }, include: [User] })
  }

  async inviteMember(workspaceId: string, dto: InviteMemberDto, invitedById: string): Promise<WorkspaceInvite> {
    await this.assertRole(workspaceId, invitedById, ['owner', 'admin'])

    const existing = await this.inviteModel.findOne({
      where: { workspaceId, email: dto.email, status: 'pending' }
    })
    if (existing) throw new ConflictException('An active invite already exists for this email')

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    return this.inviteModel.create({
      workspaceId,
      email: dto.email,
      role: dto.role ?? 'member',
      invitedById,
      token,
      expiresAt
    } as any)
  }

  async acceptInvite(token: string, userId: string, userEmail: string): Promise<WorkspaceMember> {
    const invite = await this.inviteModel.findOne({ where: { token } })

    if (!invite) throw new NotFoundException('Invite not found')
    if (invite.status !== 'pending') throw new BadRequestException('Invite is no longer valid')
    if (new Date() > invite.expiresAt) {
      await invite.update({ status: 'expired' })
      throw new BadRequestException('Invite has expired')
    }
    if (invite.email !== userEmail) throw new ForbiddenException('This invite was sent to a different email')

    const alreadyMember = await this.memberModel.findOne({ where: { workspaceId: invite.workspaceId, userId } })
    if (alreadyMember) throw new ConflictException('You are already a member of this workspace')

    const member = await this.memberModel.create({
      workspaceId: invite.workspaceId,
      userId,
      role: invite.role
    } as any)

    await invite.update({ status: 'accepted' })

    return member
  }

  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    role: 'admin' | 'member',
    requesterId: string
  ): Promise<WorkspaceMember> {
    await this.assertRole(workspaceId, requesterId, ['owner'])

    const member = await this.memberModel.findOne({ where: { id: memberId, workspaceId } })
    if (!member) throw new NotFoundException('Member not found')
    if (member.role === 'owner') throw new ForbiddenException('Cannot change the role of the workspace owner')

    return member.update({ role })
  }

  async removeMember(workspaceId: string, memberId: string, requesterId: string): Promise<void> {
    await this.assertRole(workspaceId, requesterId, ['owner', 'admin'])

    const member = await this.memberModel.findOne({ where: { id: memberId, workspaceId } })
    if (!member) throw new NotFoundException('Member not found')
    if (member.role === 'owner') throw new ForbiddenException('Cannot remove the workspace owner')

    await member.destroy()
  }

  async revokeInvite(workspaceId: string, inviteId: string, requesterId: string): Promise<void> {
    await this.assertRole(workspaceId, requesterId, ['owner', 'admin'])

    const invite = await this.inviteModel.findOne({ where: { id: inviteId, workspaceId } })
    if (!invite) throw new NotFoundException('Invite not found')

    await invite.update({ status: 'expired' })
  }

  async getPendingInvites(workspaceId: string, requesterId: string): Promise<WorkspaceInvite[]> {
    await this.assertRole(workspaceId, requesterId, ['owner', 'admin'])
    return this.inviteModel.findAll({ where: { workspaceId, status: 'pending' } })
  }

  // Shared membership check used by Teams to confirm workspace membership.
  async assertMember(workspaceId: string, userId: string): Promise<WorkspaceMember> {
    const member = await this.memberModel.findOne({ where: { workspaceId, userId } })
    if (!member) throw new ForbiddenException('You are not a member of this workspace')
    return member
  }

  private async assertRole(workspaceId: string, userId: string, allowed: string[]): Promise<void> {
    const member = await this.memberModel.findOne({ where: { workspaceId, userId } })
    if (!member || !allowed.includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions')
    }
  }
}

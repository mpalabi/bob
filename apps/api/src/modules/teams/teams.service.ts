import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException
} from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { randomBytes } from 'crypto'
import { Team } from './entities/team.model'
import { TeamMember } from './entities/team-member.model'
import { Invite } from './entities/invite.model'
import { User } from '../users/user.model'
import { WorkspacesService } from '../workspaces/workspaces.service'
import { CreateTeamDto } from './dto/create-team.dto'
import { InviteMemberDto } from './dto/invite-member.dto'

@Injectable()
export class TeamsService {
  constructor(
    @InjectModel(Team) private teamModel: typeof Team,
    @InjectModel(TeamMember) private memberModel: typeof TeamMember,
    @InjectModel(Invite) private inviteModel: typeof Invite,
    private workspacesService: WorkspacesService
  ) {}

  async createTeam(dto: CreateTeamDto, ownerId: string): Promise<Team> {
    // The creator must belong to the parent workspace.
    await this.workspacesService.assertMember(dto.workspaceId, ownerId)

    const existing = await this.teamModel.findOne({
      where: { workspaceId: dto.workspaceId, slug: dto.slug }
    })
    if (existing) throw new ConflictException('Slug already taken in this workspace')

    const team = await this.teamModel.create({
      workspaceId: dto.workspaceId,
      name: dto.name,
      slug: dto.slug
    } as any)

    await this.memberModel.create({ teamId: team.id, userId: ownerId, role: 'owner' } as any)

    return team
  }

  async getTeam(teamId: string): Promise<Team> {
    const team = await this.teamModel.findByPk(teamId, {
      include: [{ model: TeamMember, include: [User] }]
    })
    if (!team) throw new NotFoundException('Team not found')
    return team
  }

  async getMyTeams(userId: string): Promise<Team[]> {
    const memberships = await this.memberModel.findAll({
      where: { userId },
      include: [Team]
    })
    return memberships.map(m => m.team)
  }

  async getMembers(teamId: string): Promise<TeamMember[]> {
    return this.memberModel.findAll({
      where: { teamId },
      include: [User]
    })
  }

  async inviteMember(teamId: string, dto: InviteMemberDto, invitedById: string): Promise<Invite> {
    await this.assertRole(teamId, invitedById, ['owner', 'admin'])

    const existing = await this.inviteModel.findOne({
      where: { teamId, email: dto.email, status: 'pending' }
    })
    if (existing) throw new ConflictException('An active invite already exists for this email')

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    return this.inviteModel.create({
      teamId,
      email: dto.email,
      role: dto.role ?? 'member',
      invitedById,
      token,
      expiresAt
    } as any)
  }

  async acceptInvite(token: string, userId: string, userEmail: string): Promise<TeamMember> {
    const invite = await this.inviteModel.findOne({ where: { token } })

    if (!invite) throw new NotFoundException('Invite not found')
    if (invite.status !== 'pending') throw new BadRequestException('Invite is no longer valid')
    if (new Date() > invite.expiresAt) {
      await invite.update({ status: 'expired' })
      throw new BadRequestException('Invite has expired')
    }
    if (invite.email !== userEmail) throw new ForbiddenException('This invite was sent to a different email')

    const alreadyMember = await this.memberModel.findOne({ where: { teamId: invite.teamId, userId } })
    if (alreadyMember) throw new ConflictException('You are already a member of this team')

    const member = await this.memberModel.create({
      teamId: invite.teamId,
      userId,
      role: invite.role
    } as any)

    await invite.update({ status: 'accepted' })

    return member
  }

  async updateMemberRole(teamId: string, memberId: string, role: 'admin' | 'member', requesterId: string): Promise<TeamMember> {
    await this.assertRole(teamId, requesterId, ['owner'])

    const member = await this.memberModel.findOne({ where: { id: memberId, teamId } })
    if (!member) throw new NotFoundException('Member not found')
    if (member.role === 'owner') throw new ForbiddenException('Cannot change the role of the team owner')

    return member.update({ role })
  }

  async removeMember(teamId: string, memberId: string, requesterId: string): Promise<void> {
    await this.assertRole(teamId, requesterId, ['owner', 'admin'])

    const member = await this.memberModel.findOne({ where: { id: memberId, teamId } })
    if (!member) throw new NotFoundException('Member not found')
    if (member.role === 'owner') throw new ForbiddenException('Cannot remove the team owner')

    await member.destroy()
  }

  async revokeInvite(teamId: string, inviteId: string, requesterId: string): Promise<void> {
    await this.assertRole(teamId, requesterId, ['owner', 'admin'])

    const invite = await this.inviteModel.findOne({ where: { id: inviteId, teamId } })
    if (!invite) throw new NotFoundException('Invite not found')

    await invite.update({ status: 'expired' })
  }

  async getPendingInvites(teamId: string, requesterId: string): Promise<Invite[]> {
    await this.assertRole(teamId, requesterId, ['owner', 'admin'])
    return this.inviteModel.findAll({ where: { teamId, status: 'pending' } })
  }

  private async assertRole(teamId: string, userId: string, allowed: string[]): Promise<void> {
    const member = await this.memberModel.findOne({ where: { teamId, userId } })
    if (!member || !allowed.includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions')
    }
  }
}

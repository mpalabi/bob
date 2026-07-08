import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException
} from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Op } from 'sequelize'
import { Organization } from './entities/organization.model'
import { OrganizationMember } from './entities/organization-member.model'
import { OrgJoinRequest } from './entities/org-join-request.model'
import { User } from '../users/user.model'
import { CreateOrganizationDto } from './dto/create-organization.dto'

function emailDomain(email: string): string {
  return email.slice(email.lastIndexOf('@') + 1).toLowerCase()
}

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectModel(Organization) private orgModel: typeof Organization,
    @InjectModel(OrganizationMember) private memberModel: typeof OrganizationMember,
    @InjectModel(OrgJoinRequest) private joinRequestModel: typeof OrgJoinRequest
  ) {}

  async createOrganization(dto: CreateOrganizationDto, user: User): Promise<Organization> {
    const slugTaken = await this.orgModel.findOne({ where: { slug: dto.slug } })
    if (slugTaken) throw new ConflictException('Slug already taken')

    let domain: string | null = null
    if (dto.useEmailDomain) {
      domain = emailDomain(user.email)
      const domainTaken = await this.orgModel.findOne({ where: { domain } })
      if (domainTaken) {
        throw new ConflictException(`An organization for ${domain} already exists`)
      }
    }

    const org = await this.orgModel.create({
      name: dto.name,
      slug: dto.slug,
      domain,
      createdById: user.id
    } as any)

    await this.memberModel.create({
      organizationId: org.id,
      userId: user.id,
      role: 'owner'
    } as any)

    return org
  }

  async getMyOrganizations(userId: string): Promise<Organization[]> {
    const memberships = await this.memberModel.findAll({
      where: { userId },
      include: [Organization]
    })
    return memberships.map(m => m.organization)
  }

  async getOrganization(orgId: string): Promise<Organization> {
    const org = await this.orgModel.findByPk(orgId, {
      include: [{ model: OrganizationMember, include: [User] }]
    })
    if (!org) throw new NotFoundException('Organization not found')
    return org
  }

  async getMembers(orgId: string): Promise<OrganizationMember[]> {
    return this.memberModel.findAll({ where: { organizationId: orgId }, include: [User] })
  }

  // Orgs bound to the caller's email domain that they aren't already part of.
  async discoverByDomain(user: User): Promise<Organization[]> {
    const domain = emailDomain(user.email)

    const myOrgIds = (await this.memberModel.findAll({ where: { userId: user.id } }))
      .map(m => m.organizationId)

    return this.orgModel.findAll({
      where: {
        domain,
        ...(myOrgIds.length ? { id: { [Op.notIn]: myOrgIds } } : {})
      }
    })
  }

  async requestToJoin(orgId: string, user: User): Promise<OrgJoinRequest> {
    const org = await this.orgModel.findByPk(orgId)
    if (!org) throw new NotFoundException('Organization not found')

    // Only same-domain users can request to join a domain-bound org.
    if (!org.domain || org.domain !== emailDomain(user.email)) {
      throw new ForbiddenException('Your email domain does not match this organization')
    }

    const alreadyMember = await this.memberModel.findOne({
      where: { organizationId: orgId, userId: user.id }
    })
    if (alreadyMember) throw new ConflictException('You are already a member of this organization')

    const pending = await this.joinRequestModel.findOne({
      where: { organizationId: orgId, userId: user.id, status: 'pending' }
    })
    if (pending) throw new ConflictException('You already have a pending request to join')

    return this.joinRequestModel.create({
      organizationId: orgId,
      userId: user.id,
      status: 'pending'
    } as any)
  }

  async listJoinRequests(orgId: string, requesterId: string): Promise<OrgJoinRequest[]> {
    await this.assertRole(orgId, requesterId, ['owner', 'admin'])
    return this.joinRequestModel.findAll({
      where: { organizationId: orgId, status: 'pending' },
      include: [User]
    })
  }

  async resolveJoinRequest(
    orgId: string,
    requestId: string,
    action: 'approve' | 'reject',
    requesterId: string
  ): Promise<OrgJoinRequest> {
    await this.assertRole(orgId, requesterId, ['owner', 'admin'])

    const request = await this.joinRequestModel.findOne({
      where: { id: requestId, organizationId: orgId }
    })
    if (!request) throw new NotFoundException('Join request not found')
    if (request.status !== 'pending') throw new BadRequestException('Request is no longer pending')

    if (action === 'approve') {
      const existing = await this.memberModel.findOne({
        where: { organizationId: orgId, userId: request.userId }
      })
      if (!existing) {
        await this.memberModel.create({
          organizationId: orgId,
          userId: request.userId,
          role: 'member'
        } as any)
      }
      return request.update({ status: 'approved' })
    }

    return request.update({ status: 'rejected' })
  }

  // Shared membership check used by Workspaces to confirm org membership.
  async assertMember(orgId: string, userId: string): Promise<OrganizationMember> {
    const member = await this.memberModel.findOne({ where: { organizationId: orgId, userId } })
    if (!member) throw new ForbiddenException('You are not a member of this organization')
    return member
  }

  private async assertRole(orgId: string, userId: string, allowed: string[]): Promise<void> {
    const member = await this.memberModel.findOne({ where: { organizationId: orgId, userId } })
    if (!member || !allowed.includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions')
    }
  }
}

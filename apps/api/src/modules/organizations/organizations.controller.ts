import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { OrganizationsService } from './organizations.service'
import { CreateOrganizationDto } from './dto/create-organization.dto'
import { ResolveJoinRequestDto } from './dto/resolve-join-request.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { User } from '../users/user.model'

@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private orgsService: OrganizationsService) {}

  // Create an org — caller becomes owner. Set useEmailDomain to bind it to
  // the caller's email domain for discovery.
  @Post()
  create(@Body() dto: CreateOrganizationDto, @CurrentUser() user: User) {
    return this.orgsService.createOrganization(dto, user)
  }

  // Orgs the caller belongs to
  @Get('me')
  myOrgs(@CurrentUser() user: User) {
    return this.orgsService.getMyOrganizations(user.id)
  }

  // Orgs matching the caller's email domain they can request to join
  @Get('discover')
  discover(@CurrentUser() user: User) {
    return this.orgsService.discoverByDomain(user)
  }

  @Get(':orgId')
  getOrg(@Param('orgId') orgId: string) {
    return this.orgsService.getOrganization(orgId)
  }

  @Get(':orgId/members')
  getMembers(@Param('orgId') orgId: string) {
    return this.orgsService.getMembers(orgId)
  }

  // Request to join a domain-bound org
  @Post(':orgId/join-requests')
  requestToJoin(@Param('orgId') orgId: string, @CurrentUser() user: User) {
    return this.orgsService.requestToJoin(orgId, user)
  }

  // List pending join requests (owner/admin)
  @Get(':orgId/join-requests')
  listJoinRequests(@Param('orgId') orgId: string, @CurrentUser() user: User) {
    return this.orgsService.listJoinRequests(orgId, user.id)
  }

  // Approve or reject a join request (owner/admin)
  @Patch(':orgId/join-requests/:requestId')
  resolveJoinRequest(
    @Param('orgId') orgId: string,
    @Param('requestId') requestId: string,
    @Body() dto: ResolveJoinRequestDto,
    @CurrentUser() user: User
  ) {
    return this.orgsService.resolveJoinRequest(orgId, requestId, dto.action, user.id)
  }
}

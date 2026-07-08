import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { Organization } from './entities/organization.model'
import { OrganizationMember } from './entities/organization-member.model'
import { OrgJoinRequest } from './entities/org-join-request.model'
import { OrganizationsService } from './organizations.service'
import { OrganizationsController } from './organizations.controller'

@Module({
  imports: [SequelizeModule.forFeature([Organization, OrganizationMember, OrgJoinRequest])],
  providers: [OrganizationsService],
  controllers: [OrganizationsController],
  exports: [OrganizationsService]
})
export class OrganizationsModule {}

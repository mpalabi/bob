import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { Workspace } from './entities/workspace.model'
import { WorkspaceMember } from './entities/workspace-member.model'
import { WorkspaceInvite } from './entities/workspace-invite.model'
import { WorkspacesService } from './workspaces.service'
import { WorkspacesController } from './workspaces.controller'
import { OrganizationsModule } from '../organizations/organizations.module'

@Module({
  imports: [
    SequelizeModule.forFeature([Workspace, WorkspaceMember, WorkspaceInvite]),
    OrganizationsModule
  ],
  providers: [WorkspacesService],
  controllers: [WorkspacesController],
  exports: [WorkspacesService]
})
export class WorkspacesModule {}

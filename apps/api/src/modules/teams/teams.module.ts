import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { Team } from './entities/team.model'
import { TeamMember } from './entities/team-member.model'
import { Invite } from './entities/invite.model'
import { TeamsService } from './teams.service'
import { TeamsController } from './teams.controller'
import { WorkspacesModule } from '../workspaces/workspaces.module'

@Module({
  imports: [SequelizeModule.forFeature([Team, TeamMember, Invite]), WorkspacesModule],
  providers: [TeamsService],
  controllers: [TeamsController],
  exports: [TeamsService]
})
export class TeamsModule {}

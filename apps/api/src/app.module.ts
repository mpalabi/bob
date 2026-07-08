import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SequelizeModule } from '@nestjs/sequelize'
import { DatabaseModule } from './database/database.module'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { ChatModule } from './modules/chat/chat.module'
import { DmModule } from './modules/dm/dm.module'
import { RealtimeModule } from './modules/realtime/realtime.module'
import { TasksModule } from './modules/tasks/tasks.module'
import { FilesModule } from './modules/files/files.module'
import { AiModule } from './modules/ai/ai.module'
import { KnowledgeModule } from './modules/knowledge/knowledge.module'
import { TeamsModule } from './modules/teams/teams.module'
import { OrganizationsModule } from './modules/organizations/organizations.module'
import { WorkspacesModule } from './modules/workspaces/workspaces.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    WorkspacesModule,
    TeamsModule,
    ChatModule,
    DmModule,
    RealtimeModule,
    TasksModule,
    FilesModule,
    AiModule,
    KnowledgeModule
  ]
})
export class AppModule {}

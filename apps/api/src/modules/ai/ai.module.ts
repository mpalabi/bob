import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { AiSetting } from './entities/ai-setting.model'
import { AiService } from './ai.service'
import { AiSettingsService } from './ai-settings.service'
import { AiSettingsController } from './ai-settings.controller'
import { AiGateway } from './ai.gateway'
import { VisionAgent } from './agents/vision.agent'
import { AuthModule } from '../auth/auth.module'
import { KnowledgeModule } from '../knowledge/knowledge.module'
import { TasksModule } from '../tasks/tasks.module'

@Module({
  imports: [SequelizeModule.forFeature([AiSetting]), AuthModule, KnowledgeModule, TasksModule],
  providers: [AiService, AiSettingsService, AiGateway, VisionAgent],
  controllers: [AiSettingsController]
})
export class AiModule {}

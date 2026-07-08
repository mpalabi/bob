import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { Task } from './entities/task.model'
import { Project } from './entities/project.model'
import { TasksService } from './tasks.service'
import { TasksController } from './tasks.controller'
import { RealtimeModule } from '../realtime/realtime.module'

@Module({
  imports: [SequelizeModule.forFeature([Task, Project]), RealtimeModule],
  providers: [TasksService],
  controllers: [TasksController],
  exports: [TasksService]
})
export class TasksModule {}

import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import type { Task as TaskDto, Project as ProjectDto } from '@bob/shared'
import { TasksService } from './tasks.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { User } from '../users/user.model'
import { RealtimeGateway } from '../realtime/realtime.gateway'

@UseGuards(JwtAuthGuard)
@Controller()
export class TasksController {
  constructor(
    private tasksService: TasksService,
    private realtime: RealtimeGateway
  ) {}

  // ─── Tasks ────────────────────────────────────────────────────────────────

  @Get('tasks')
  findAll() {
    return this.tasksService.findAll()
  }

  @Get('tasks/:id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findById(id)
  }

  @Post('tasks')
  async create(
    @Body() body: { title: string; description?: string; priority?: string; projectId?: string; assigneeId?: string; startAt?: string; dueAt?: string },
    @CurrentUser() user: User
  ) {
    const task = await this.tasksService.create({ ...body, createdById: user.id })
    this.realtime.emitTaskCreated(task.toJSON() as unknown as TaskDto)
    return task
  }

  @Patch('tasks/:id')
  async update(@Param('id') id: string, @Body() body: any) {
    const task = await this.tasksService.update(id, body)
    this.realtime.emitTaskUpdated(task.toJSON() as unknown as TaskDto)
    return task
  }

  @Delete('tasks/:id')
  async remove(@Param('id') id: string) {
    await this.tasksService.remove(id)
    this.realtime.emitTaskDeleted(id)
  }

  // ─── Projects ─────────────────────────────────────────────────────────────

  @Get('projects')
  findAllProjects() {
    return this.tasksService.findAllProjects()
  }

  @Get('projects/:id/tasks')
  findProjectTasks(@Param('id') id: string) {
    return this.tasksService.findByProject(id)
  }

  @Post('projects')
  async createProject(
    @Body() body: { name: string; color?: string },
    @CurrentUser() user: User
  ) {
    const project = await this.tasksService.createProject({ ...body, createdById: user.id })
    this.realtime.emitProjectCreated(project.toJSON() as unknown as ProjectDto)
    return project
  }

  @Patch('projects/:id')
  async updateProject(@Param('id') id: string, @Body() body: { name?: string; color?: string }) {
    const project = await this.tasksService.updateProject(id, body)
    this.realtime.emitProjectUpdated(project.toJSON() as unknown as ProjectDto)
    return project
  }

  @Delete('projects/:id')
  async removeProject(@Param('id') id: string) {
    await this.tasksService.removeProject(id)
    this.realtime.emitProjectDeleted(id)
  }
}

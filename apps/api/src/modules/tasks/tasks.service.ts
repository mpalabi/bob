import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Task } from './entities/task.model'
import { Project } from './entities/project.model'
import { Op } from 'sequelize'

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task) private taskModel: typeof Task,
    @InjectModel(Project) private projectModel: typeof Project,
  ) {}

  // ─── Tasks ────────────────────────────────────────────────────────────────

  findAll() {
    return this.taskModel.findAll({ order: [['createdAt', 'DESC']] })
  }

  findByProject(projectId: string) {
    return this.taskModel.findAll({ where: { projectId }, order: [['createdAt', 'DESC']] })
  }

  async findById(id: string) {
    const task = await this.taskModel.findByPk(id)
    if (!task) throw new NotFoundException('Task not found')
    return task
  }

  create(data: { title: string; description?: string; priority?: string; createdById: string; assigneeId?: string; projectId?: string; startAt?: string; dueAt?: string }) {
    return this.taskModel.create(data as any)
  }

  async update(id: string, data: Partial<{ title: string; description: string; status: string; priority: string; assigneeId: string; projectId: string; startAt: string | null; dueAt: string | null }>) {
    const task = await this.findById(id)
    return task.update(data)
  }

  async remove(id: string) {
    const task = await this.findById(id)
    await task.destroy()
  }

  // ─── Projects ─────────────────────────────────────────────────────────────

  findAllProjects() {
    return this.projectModel.findAll({ order: [['createdAt', 'ASC']] })
  }

  async findProjectById(id: string) {
    const project = await this.projectModel.findByPk(id)
    if (!project) throw new NotFoundException('Project not found')
    return project
  }

  findProjectByName(name: string) {
    return this.projectModel.findOne({ where: { name: { [Op.iLike]: name } } })
  }

  createProject(data: { name: string; color?: string; createdById: string }) {
    return this.projectModel.create(data as any)
  }

  async updateProject(id: string, data: Partial<{ name: string; color: string }>) {
    const project = await this.findProjectById(id)
    return project.update(data)
  }

  async removeProject(id: string) {
    const project = await this.findProjectById(id)
    await project.destroy()
  }

  // Find or create a project by name (used by AI tool)
  async findOrCreateProject(name: string, createdById: string): Promise<Project> {
    const existing = await this.findProjectByName(name)
    if (existing) return existing
    return this.projectModel.create({ name, createdById } as any)
  }
}

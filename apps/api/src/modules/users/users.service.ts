import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import type { UserPresence } from '@bob/shared'
import { User } from './user.model'

@Injectable()
export class UsersService {
  constructor(@InjectModel(User) private userModel: typeof User) {}

  async findById(id: string): Promise<User> {
    const user = await this.userModel.findByPk(id)
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  async findByIdOrNull(id: string): Promise<User | null> {
    return this.userModel.findByPk(id)
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ where: { email } })
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userModel.findOne({ where: { googleId } })
  }

  /** Everyone except the given user — used to populate the contacts list. */
  async findAllExcept(userId: string): Promise<User[]> {
    const users = await this.userModel.findAll({ order: [['name', 'ASC']] })
    return users.filter((u) => u.id !== userId)
  }

  async create(data: {
    email: string
    name: string
    passwordHash?: string | null
    googleId?: string | null
    avatarUrl?: string | null
  }): Promise<User> {
    return this.userModel.create(data as any)
  }

  async updatePresence(id: string, presence: UserPresence): Promise<void> {
    await this.userModel.update({ presence }, { where: { id } })
  }
}

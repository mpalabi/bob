import { BelongsTo, Column, DataType, Default, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript'
import { User } from '../../users/user.model'
import { Project } from './project.model'

@Table({ tableName: 'tasks', timestamps: true })
export class Task extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @Column(DataType.STRING)
  declare title: string

  @Column({ type: DataType.TEXT, allowNull: true })
  declare description: string | null

  @Default('todo')
  @Column(DataType.ENUM('todo', 'in_progress', 'done'))
  declare status: string

  @Default('medium')
  @Column(DataType.ENUM('low', 'medium', 'high'))
  declare priority: string

  @ForeignKey(() => Project)
  @Column({ type: DataType.UUID, allowNull: true })
  declare projectId: string | null

  @Column({ type: DataType.DATE, allowNull: true })
  declare startAt: Date | null

  @Column({ type: DataType.DATE, allowNull: true })
  declare dueAt: Date | null

  @BelongsTo(() => Project)
  declare project: Project

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  declare assigneeId: string | null

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare createdById: string

  @BelongsTo(() => User, 'assigneeId')
  declare assignee: User

  @BelongsTo(() => User, 'createdById')
  declare createdBy: User
}

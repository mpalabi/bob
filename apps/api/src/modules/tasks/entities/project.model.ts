import { BelongsTo, Column, DataType, Default, ForeignKey, HasMany, Model, PrimaryKey, Table } from 'sequelize-typescript'
import { User } from '../../users/user.model'
import { Task } from './task.model'

@Table({ tableName: 'projects', timestamps: true })
export class Project extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @Column(DataType.STRING)
  declare name: string

  @Default('#6366f1')
  @Column(DataType.STRING)
  declare color: string

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare createdById: string

  @BelongsTo(() => User, 'createdById')
  declare createdBy: User

  @HasMany(() => Task)
  declare tasks: Task[]
}

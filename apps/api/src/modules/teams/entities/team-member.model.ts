import { BelongsTo, Column, DataType, Default, ForeignKey, Model, PrimaryKey, Table, Unique } from 'sequelize-typescript'
import { Team } from './team.model'
import { User } from '../../users/user.model'

export type TeamRole = 'owner' | 'admin' | 'member'

@Table({ tableName: 'team_members', timestamps: true })
export class TeamMember extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  declare teamId: string

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare userId: string

  @Default('member')
  @Column(DataType.ENUM('owner', 'admin', 'member'))
  declare role: TeamRole

  @BelongsTo(() => Team)
  declare team: Team

  @BelongsTo(() => User)
  declare user: User
}

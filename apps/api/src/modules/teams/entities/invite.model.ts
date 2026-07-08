import { BelongsTo, Column, DataType, Default, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript'
import { Team } from './team.model'
import { User } from '../../users/user.model'

export type InviteStatus = 'pending' | 'accepted' | 'expired'

@Table({ tableName: 'invites', timestamps: true })
export class Invite extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  declare teamId: string

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare invitedById: string

  @Column(DataType.STRING)
  declare email: string

  @Column(DataType.STRING)
  declare token: string

  @Default('member')
  @Column(DataType.ENUM('owner', 'admin', 'member'))
  declare role: string

  @Default('pending')
  @Column(DataType.ENUM('pending', 'accepted', 'expired'))
  declare status: InviteStatus

  @Column(DataType.DATE)
  declare expiresAt: Date

  @BelongsTo(() => Team)
  declare team: Team

  @BelongsTo(() => User, 'invitedById')
  declare invitedBy: User
}

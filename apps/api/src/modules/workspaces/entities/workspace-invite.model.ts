import { BelongsTo, Column, DataType, Default, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript'
import type { InviteStatus, MemberRole } from '@bob/shared'
import { Workspace } from './workspace.model'
import { User } from '../../users/user.model'

@Table({ tableName: 'workspace_invites', timestamps: true })
export class WorkspaceInvite extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @ForeignKey(() => Workspace)
  @Column(DataType.UUID)
  declare workspaceId: string

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare invitedById: string

  @Column(DataType.STRING)
  declare email: string

  @Column(DataType.STRING)
  declare token: string

  @Default('member')
  @Column(DataType.ENUM('owner', 'admin', 'member'))
  declare role: MemberRole

  @Default('pending')
  @Column(DataType.ENUM('pending', 'accepted', 'expired'))
  declare status: InviteStatus

  @Column(DataType.DATE)
  declare expiresAt: Date

  @BelongsTo(() => Workspace)
  declare workspace: Workspace

  @BelongsTo(() => User, 'invitedById')
  declare invitedBy: User
}

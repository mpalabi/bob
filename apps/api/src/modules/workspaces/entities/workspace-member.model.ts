import { BelongsTo, Column, DataType, Default, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript'
import type { MemberRole } from '@bob/shared'
import { Workspace } from './workspace.model'
import { User } from '../../users/user.model'

@Table({ tableName: 'workspace_members', timestamps: true })
export class WorkspaceMember extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @ForeignKey(() => Workspace)
  @Column(DataType.UUID)
  declare workspaceId: string

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare userId: string

  @Default('member')
  @Column(DataType.ENUM('owner', 'admin', 'member'))
  declare role: MemberRole

  @BelongsTo(() => Workspace)
  declare workspace: Workspace

  @BelongsTo(() => User)
  declare user: User
}

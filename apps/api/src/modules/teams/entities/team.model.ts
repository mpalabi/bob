import { BelongsTo, Column, DataType, Default, ForeignKey, HasMany, Model, PrimaryKey, Table } from 'sequelize-typescript'
import { Workspace } from '../../workspaces/entities/workspace.model'
import { TeamMember } from './team-member.model'
import { Invite } from './invite.model'

@Table({ tableName: 'teams', timestamps: true })
export class Team extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @ForeignKey(() => Workspace)
  // slug is unique per workspace (composite unique with workspaceId)
  @Column({ type: DataType.UUID, unique: 'team_workspace_slug' })
  declare workspaceId: string

  @Column(DataType.STRING)
  declare name: string

  @Column({ type: DataType.STRING, unique: 'team_workspace_slug' })
  declare slug: string

  @Column({ type: DataType.STRING, allowNull: true })
  declare avatarUrl: string | null

  @BelongsTo(() => Workspace)
  declare workspace: Workspace

  @HasMany(() => TeamMember)
  declare members: TeamMember[]

  @HasMany(() => Invite)
  declare invites: Invite[]
}

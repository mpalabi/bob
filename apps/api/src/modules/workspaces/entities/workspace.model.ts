import { BelongsTo, Column, DataType, Default, ForeignKey, HasMany, Model, PrimaryKey, Table } from 'sequelize-typescript'
import { Organization } from '../../organizations/entities/organization.model'
import { WorkspaceMember } from './workspace-member.model'
import { WorkspaceInvite } from './workspace-invite.model'

@Table({ tableName: 'workspaces', timestamps: true })
export class Workspace extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @ForeignKey(() => Organization)
  // slug is unique per organization (composite unique with organizationId)
  @Column({ type: DataType.UUID, unique: 'workspace_org_slug' })
  declare organizationId: string

  @Column(DataType.STRING)
  declare name: string

  @Column({ type: DataType.STRING, unique: 'workspace_org_slug' })
  declare slug: string

  @Column({ type: DataType.STRING, allowNull: true })
  declare avatarUrl: string | null

  @BelongsTo(() => Organization)
  declare organization: Organization

  @HasMany(() => WorkspaceMember)
  declare members: WorkspaceMember[]

  @HasMany(() => WorkspaceInvite)
  declare invites: WorkspaceInvite[]
}

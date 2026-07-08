import { Column, DataType, Default, ForeignKey, HasMany, Model, PrimaryKey, Table, Unique } from 'sequelize-typescript'
import { User } from '../../users/user.model'
import { OrganizationMember } from './organization-member.model'
import { OrgJoinRequest } from './org-join-request.model'

@Table({ tableName: 'organizations', timestamps: true })
export class Organization extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @Column(DataType.STRING)
  declare name: string

  @Unique
  @Column(DataType.STRING)
  declare slug: string

  // Email domain bound to the org (e.g. "acme.com"). Unique so a domain maps
  // to a single org for discovery; null for personal orgs.
  @Unique
  @Column({ type: DataType.STRING, allowNull: true })
  declare domain: string | null

  @Column({ type: DataType.STRING, allowNull: true })
  declare avatarUrl: string | null

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare createdById: string

  @HasMany(() => OrganizationMember)
  declare members: OrganizationMember[]

  @HasMany(() => OrgJoinRequest)
  declare joinRequests: OrgJoinRequest[]
}

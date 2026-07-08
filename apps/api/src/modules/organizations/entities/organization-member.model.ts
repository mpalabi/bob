import { BelongsTo, Column, DataType, Default, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript'
import type { MemberRole } from '@bob/shared'
import { Organization } from './organization.model'
import { User } from '../../users/user.model'

@Table({ tableName: 'organization_members', timestamps: true })
export class OrganizationMember extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @ForeignKey(() => Organization)
  @Column(DataType.UUID)
  declare organizationId: string

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare userId: string

  @Default('member')
  @Column(DataType.ENUM('owner', 'admin', 'member'))
  declare role: MemberRole

  @BelongsTo(() => Organization)
  declare organization: Organization

  @BelongsTo(() => User)
  declare user: User
}

import { BelongsTo, Column, DataType, Default, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript'
import type { JoinRequestStatus } from '@bob/shared'
import { Organization } from './organization.model'
import { User } from '../../users/user.model'

@Table({ tableName: 'org_join_requests', timestamps: true })
export class OrgJoinRequest extends Model {
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

  @Default('pending')
  @Column(DataType.ENUM('pending', 'approved', 'rejected'))
  declare status: JoinRequestStatus

  @BelongsTo(() => Organization)
  declare organization: Organization

  @BelongsTo(() => User)
  declare user: User
}

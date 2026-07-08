import { Column, DataType, Default, Model, PrimaryKey, Table } from 'sequelize-typescript'

@Table({ tableName: 'direct_messages', timestamps: true })
export class DirectMessage extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @Column(DataType.UUID)
  declare senderId: string

  @Column(DataType.UUID)
  declare recipientId: string

  @Column(DataType.TEXT)
  declare content: string

  @Column({ type: DataType.DATE, allowNull: true })
  declare readAt: Date | null
}

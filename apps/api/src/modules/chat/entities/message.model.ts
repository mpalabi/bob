import { BelongsTo, Column, DataType, Default, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript'
import { Channel } from './channel.model'
import { User } from '../../users/user.model'

@Table({ tableName: 'messages', timestamps: true })
export class Message extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @ForeignKey(() => Channel)
  @Column(DataType.UUID)
  declare channelId: string

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  declare userId: string

  @Column(DataType.TEXT)
  declare content: string

  @BelongsTo(() => Channel)
  declare channel: Channel

  @BelongsTo(() => User)
  declare user: User
}

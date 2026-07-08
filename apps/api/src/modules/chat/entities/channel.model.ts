import { Column, DataType, Default, HasMany, Model, PrimaryKey, Table } from 'sequelize-typescript'
import { Message } from './message.model'

@Table({ tableName: 'channels', timestamps: true })
export class Channel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @Column(DataType.STRING)
  declare name: string

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare isPrivate: boolean

  @HasMany(() => Message)
  declare messages: Message[]
}

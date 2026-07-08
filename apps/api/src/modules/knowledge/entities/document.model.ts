import { Column, DataType, Default, Model, PrimaryKey, Table } from 'sequelize-typescript'

@Table({ tableName: 'knowledge_documents', timestamps: true })
export class KnowledgeDocument extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @Column(DataType.UUID)
  declare userId: string

  @Column(DataType.STRING)
  declare name: string

  @Column(DataType.STRING)
  declare mimeType: string

  @Column(DataType.INTEGER)
  declare size: number

  @Column({ type: DataType.STRING, defaultValue: 'processing' })
  declare status: 'processing' | 'ready' | 'error'

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  declare chunkCount: number
}

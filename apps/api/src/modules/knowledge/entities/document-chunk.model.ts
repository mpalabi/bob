import { Column, DataType, Default, Model, PrimaryKey, Table } from 'sequelize-typescript'

// Embedding is stored via raw SQL (pgvector) — Sequelize doesn't support the vector type natively.
// This model handles all non-vector fields; chunk retrieval uses raw queries.
@Table({ tableName: 'knowledge_chunks', timestamps: false })
export class KnowledgeChunk extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @Column(DataType.UUID)
  declare documentId: string

  @Column(DataType.UUID)
  declare userId: string

  @Column(DataType.TEXT)
  declare content: string

  @Column(DataType.INTEGER)
  declare chunkIndex: number
}

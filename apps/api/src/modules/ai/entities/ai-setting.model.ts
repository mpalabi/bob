import { Column, DataType, Default, Model, PrimaryKey, Table } from 'sequelize-typescript'

// One row per user holding their chosen AI provider/model and (optional) key.
@Table({ tableName: 'ai_settings', timestamps: true })
export class AiSetting extends Model {
  @PrimaryKey
  @Column({ type: DataType.UUID, field: 'userId' })
  declare userId: string

  @Default('deepseek')
  @Column(DataType.STRING)
  declare provider: string

  @Column(DataType.STRING)
  declare model: string

  // The user's own API key for the selected provider. Null falls back to the
  // server's env key (if any). Stored as-is in dev; encrypt at rest for prod.
  @Column({ type: DataType.TEXT, allowNull: true })
  declare apiKey: string | null
}

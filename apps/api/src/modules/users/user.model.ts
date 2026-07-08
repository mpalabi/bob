import { Column, DataType, Default, Model, PrimaryKey, Table, Unique } from 'sequelize-typescript'

@Table({ tableName: 'users', timestamps: true })
export class User extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string

  @Unique
  @Column(DataType.STRING)
  declare email: string

  @Column(DataType.STRING)
  declare name: string

  // Null for accounts created via an OAuth provider (e.g. Google).
  @Column({ type: DataType.STRING, allowNull: true })
  declare passwordHash: string | null

  // Set for users who signed in with Google; null otherwise.
  @Unique
  @Column({ type: DataType.STRING, allowNull: true })
  declare googleId: string | null

  @Column({ type: DataType.STRING, allowNull: true })
  declare avatarUrl: string | null

  @Default('offline')
  @Column(DataType.ENUM('online', 'away', 'busy', 'offline'))
  declare presence: string

  // Never expose the password hash when the model is serialized
  // (HTTP responses, socket payloads, JSON.stringify, etc).
  toJSON() {
    const values = { ...super.toJSON() } as Record<string, unknown>
    delete values.passwordHash
    return values
  }
}

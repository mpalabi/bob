import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { ConfigModule, ConfigService } from '@nestjs/config'

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        dialect: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USER', 'bob'),
        password: config.get('DB_PASSWORD', 'bob_secret'),
        database: config.get('DB_NAME', 'bob_db'),
        autoLoadModels: true,
        synchronize: true,
        sync: { alter: { drop: false } },
        logging: false
      })
    })
  ]
})
export class DatabaseModule {}

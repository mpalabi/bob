import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import { DirectMessage } from './entities/direct-message.model'
import { DmService } from './dm.service'
import { DmController } from './dm.controller'
import { UsersModule } from '../users/users.module'

@Module({
  imports: [SequelizeModule.forFeature([DirectMessage]), UsersModule],
  providers: [DmService],
  controllers: [DmController],
  exports: [DmService]
})
export class DmModule {}

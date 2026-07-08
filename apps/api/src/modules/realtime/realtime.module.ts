import { Module } from '@nestjs/common'
import { RealtimeGateway } from './realtime.gateway'
import { AuthModule } from '../auth/auth.module'
import { UsersModule } from '../users/users.module'
import { DmModule } from '../dm/dm.module'

// AuthModule exports JwtModule (→ JwtService) for socket token verification.
@Module({
  imports: [AuthModule, UsersModule, DmModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway]
})
export class RealtimeModule {}

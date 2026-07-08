import { IsEmail, IsEnum, IsOptional } from 'class-validator'
import type { MemberRole } from '@bob/shared'

export class InviteMemberDto {
  @IsEmail()
  email: string

  @IsOptional()
  @IsEnum(['owner', 'admin', 'member'])
  role?: MemberRole
}

import { IsEmail, IsEnum, IsOptional } from 'class-validator'

export class InviteMemberDto {
  @IsEmail()
  email: string

  @IsOptional()
  @IsEnum(['owner', 'admin', 'member'])
  role?: 'owner' | 'admin' | 'member'
}

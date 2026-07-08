import { IsIn } from 'class-validator'

export class ResolveJoinRequestDto {
  @IsIn(['approve', 'reject'])
  action: 'approve' | 'reject'
}

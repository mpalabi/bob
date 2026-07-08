import { IsString, IsUUID, MinLength, Matches } from 'class-validator'

export class CreateTeamDto {
  @IsUUID()
  workspaceId: string

  @IsString()
  @MinLength(2)
  name: string

  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase letters, numbers, and hyphens only' })
  slug: string
}

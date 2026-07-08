import { IsBoolean, IsOptional, IsString, Matches, MinLength } from 'class-validator'

export class CreateOrganizationDto {
  @IsString()
  @MinLength(2)
  name: string

  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase letters, numbers, and hyphens only' })
  slug: string

  // When true, bind the org to the creator's email domain so same-domain
  // users can discover it and request to join.
  @IsOptional()
  @IsBoolean()
  useEmailDomain?: boolean
}

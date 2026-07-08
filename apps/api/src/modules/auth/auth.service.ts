import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import type { AuthResponse } from '@bob/shared'
import { UsersService } from '../users/users.service'
import { User } from '../users/user.model'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.usersService.findByEmail(dto.email)
    if (existing) throw new ConflictException('Email already in use')

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const user = await this.usersService.create({ email: dto.email, name: dto.name, passwordHash })

    return this.buildResponse(user)
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(dto.email)
    if (!user) throw new UnauthorizedException('Invalid credentials')

    // OAuth-only accounts have no password — they must use their provider.
    if (!user.passwordHash) {
      throw new UnauthorizedException('This account uses Google sign-in. Continue with Google instead.')
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Invalid credentials')

    return this.buildResponse(user)
  }

  private buildResponse(user: User): AuthResponse {
    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email })
    // user.toJSON() strips passwordHash; cast to the shared shape.
    return { accessToken, user: user.toJSON() as unknown as AuthResponse['user'] }
  }
}

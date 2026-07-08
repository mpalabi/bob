import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as https from 'https'
import type { AuthResponse } from '@bob/shared'
import { UsersService } from '../users/users.service'
import { User } from '../users/user.model'

interface GoogleTokenResponse {
  access_token: string
  id_token: string
}

interface GoogleProfile {
  sub: string
  email: string
  name?: string
  picture?: string
}

// Dependency-free Google OAuth (authorization-code flow) using Node's https
// module. Inactive until GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are set.
@Injectable()
export class GoogleAuthService {
  constructor(
    private config: ConfigService,
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  get isConfigured(): boolean {
    return Boolean(this.config.get('GOOGLE_CLIENT_ID') && this.config.get('GOOGLE_CLIENT_SECRET'))
  }

  private get callbackUrl(): string {
    return this.config.get(
      'GOOGLE_CALLBACK_URL',
      `http://localhost:${this.config.get('PORT', '4233')}/auth/google/callback`
    )
  }

  /** Where the callback redirects after issuing our JWT (desktop intercepts this). */
  get successUrl(): string {
    return this.config.get(
      'GOOGLE_SUCCESS_URL',
      `http://localhost:${this.config.get('PORT', '4233')}/auth/google/success`
    )
  }

  buildAuthUrl(): string {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.'
      )
    }
    const params = new URLSearchParams({
      client_id: this.config.get('GOOGLE_CLIENT_ID', ''),
      redirect_uri: this.callbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account'
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  async handleCallback(code: string): Promise<AuthResponse> {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException('Google sign-in is not configured.')
    }
    const tokens = await this.exchangeCode(code)
    const profile = await this.fetchProfile(tokens.access_token)
    const user = await this.findOrCreateUser(profile)
    return this.buildResponse(user)
  }

  private exchangeCode(code: string): Promise<GoogleTokenResponse> {
    const body = new URLSearchParams({
      code,
      client_id: this.config.get('GOOGLE_CLIENT_ID', ''),
      client_secret: this.config.get('GOOGLE_CLIENT_SECRET', ''),
      redirect_uri: this.callbackUrl,
      grant_type: 'authorization_code'
    }).toString()

    return this.request<GoogleTokenResponse>(
      'oauth2.googleapis.com',
      '/token',
      'POST',
      body,
      { 'Content-Type': 'application/x-www-form-urlencoded' }
    )
  }

  private fetchProfile(accessToken: string): Promise<GoogleProfile> {
    return this.request<GoogleProfile>(
      'www.googleapis.com',
      '/oauth2/v3/userinfo',
      'GET',
      undefined,
      { Authorization: `Bearer ${accessToken}` }
    )
  }

  private async findOrCreateUser(profile: GoogleProfile): Promise<User> {
    if (!profile.email) throw new UnauthorizedException('Google account has no email')

    const byGoogle = await this.usersService.findByGoogleId(profile.sub)
    if (byGoogle) return byGoogle

    // Link an existing email-based account to this Google identity.
    const byEmail = await this.usersService.findByEmail(profile.email)
    if (byEmail) {
      byEmail.googleId = profile.sub
      if (!byEmail.avatarUrl && profile.picture) byEmail.avatarUrl = profile.picture
      await byEmail.save()
      return byEmail
    }

    return this.usersService.create({
      email: profile.email,
      name: profile.name ?? profile.email.split('@')[0],
      googleId: profile.sub,
      avatarUrl: profile.picture ?? null,
      passwordHash: null
    })
  }

  private buildResponse(user: User): AuthResponse {
    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email })
    return { accessToken, user: user.toJSON() as unknown as AuthResponse['user'] }
  }

  private request<T>(
    host: string,
    path: string,
    method: 'GET' | 'POST',
    body: string | undefined,
    headers: Record<string, string>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          host,
          path,
          method,
          headers: { ...headers, ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}) }
        },
        (res) => {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => {
            try {
              const json = JSON.parse(data)
              if ((res.statusCode ?? 500) >= 400) {
                reject(new UnauthorizedException(`Google OAuth error: ${data}`))
              } else {
                resolve(json as T)
              }
            } catch {
              reject(new UnauthorizedException('Invalid response from Google'))
            }
          })
        }
      )
      req.on('error', reject)
      if (body) req.write(body)
      req.end()
    })
  }
}

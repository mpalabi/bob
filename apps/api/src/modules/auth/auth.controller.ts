import { Body, Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import { AuthService } from './auth.service'
import { GoogleAuthService } from './google-auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { User } from '../users/user.model'

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private googleAuth: GoogleAuthService
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: User) {
    return user
  }

  // ─── Google OAuth ─────────────────────────────────────────────────────────

  // Step 1: redirect the browser to Google's consent screen.
  @Get('google')
  google(@Res() res: Response) {
    res.redirect(this.googleAuth.buildAuthUrl())
  }

  // Step 2: Google redirects back here with a code. We exchange it for a
  // profile, mint our own JWT, then redirect to the success URL with the
  // token in the fragment — the desktop app intercepts this navigation.
  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Res() res: Response) {
    const { accessToken } = await this.googleAuth.handleCallback(code)
    res.redirect(`${this.googleAuth.successUrl}#token=${accessToken}`)
  }

  // Fallback page shown if the desktop app doesn't intercept the redirect.
  @Get('google/success')
  googleSuccess(@Res() res: Response) {
    res.type('html').send(
      '<!doctype html><meta charset="utf-8"><title>Signed in</title>' +
        '<body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0">' +
        '<p>Signed in with Google. You can close this window.</p></body>'
    )
  }
}

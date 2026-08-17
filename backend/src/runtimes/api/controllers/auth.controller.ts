import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from '@/modules/auth/application/use-cases/auth.service';
import { JwtAuthGuard, JwtPayload } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/infrastructure/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() body: { username: string; password: string }) {
    return this.auth.loginWithPassword(body.username, body.password);
  }

  @Post('firebase')
  loginFirebase(@Body() body: { idToken: string }) {
    return this.auth.loginWithFirebase(body.idToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.me(user.sub);
  }
}

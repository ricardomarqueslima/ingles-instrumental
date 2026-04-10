import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: any) {
    return this.authService.login(body.email, body.password);
  }

  @Post('register')
  register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Post('access')
  getAccess(@Body() body: any) {
    return this.authService.getAccess(body.token, body.cursoId);
  }

  @Post('update-photo')
  updatePhoto(@Body() body: any) {
    return this.authService.updatePhoto(body.token, body.foto);
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: any) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  resetPassword(@Body() body: any) {
    return this.authService.resetPassword(body.email, body.code, body.newPassword);
  }
}
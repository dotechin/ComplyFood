import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { UserRole } from '../../common/decorators/roles.decorator';

class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsUUID() orgId?: string;
}

class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

class PasswordResetRequestDto {
  @IsEmail() email: string;
}

class PasswordResetConfirmDto {
  @IsString() token: string;
  @IsString() @MinLength(8) password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password, dto.role, dto.orgId);
  }

  @Post('login')
  @UseGuards(AuthGuard('local'))
  login(@CurrentUser() user: any) {
    return this.authService.login(user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: any) {
    return user;
  }

  @Post('password-reset/request')
  requestPasswordReset(@Body() dto: PasswordResetRequestDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('password-reset/confirm')
  resetPassword(@Body() dto: PasswordResetConfirmDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }
}

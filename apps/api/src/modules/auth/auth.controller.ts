import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Transform } from 'class-transformer';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../common/decorators/roles.decorator';

class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsUUID() orgId?: string;
}

class PasswordResetRequestDto {
  @IsEmail() email: string;
}

class PasswordResetConfirmDto {
  @IsString() token: string;
  @IsString() @MinLength(8) password: string;
}

class BootstrapDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2, { message: 'Organization name must be at least 2 characters' })
  organizationName: string;

  @IsOptional()
  @IsString()
  organizationAddress?: string;

  @IsOptional()
  @IsString()
  organizationCategory?: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  register(@CurrentUser() user: any, @Body() dto: RegisterDto, @Req() request: Request) {
    request.body.password = '[REDACTED]';
    return this.authService.register(dto.email, dto.password, dto.role, user.orgId);
  }

  @Post('bootstrap')
  bootstrap(@Body() dto: BootstrapDto) {
    return this.authService.bootstrapOrganization(
      dto.organizationName,
      dto.email,
      dto.password,
      dto.organizationAddress,
      dto.organizationCategory,
    );
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

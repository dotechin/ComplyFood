import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../../common/decorators/roles.decorator';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  login(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role, orgId: user.orgId };
    return { accessToken: this.jwtService.sign(payload), user: { id: user.id, email: user.email, role: user.role, orgId: user.orgId } };
  }

  async register(email: string, password: string, role: UserRole = UserRole.STAFF, orgId?: string) {
    const user = await this.usersService.create(email, password, role, orgId);
    return this.login(user);
  }

  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { message: 'If the account exists, a password reset link will be sent.' };
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.usersService.setPasswordResetToken(user.id, tokenHash, expiresAt);

    const response: Record<string, string> = {
      message: 'If the account exists, a password reset link will be sent.',
    };

    if (process.env.NODE_ENV !== 'production') {
      const webUrl = process.env.WEB_URL || 'http://localhost:3000';
      response.resetToken = token;
      response.resetUrl = `${webUrl}/reset-password?token=${encodeURIComponent(token)}`;
    }

    return response;
  }

  async resetPassword(token: string, password: string) {
    if (!token) {
      throw new BadRequestException('Reset token is required');
    }

    const tokenHash = this.hashToken(token);
    const user = await this.usersService.findByPasswordResetTokenHash(tokenHash);
    if (!user) {
      throw new BadRequestException('Password reset token is invalid or has expired');
    }

    await this.usersService.updatePassword(user.id, password);
    return { message: 'Password updated successfully.' };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}

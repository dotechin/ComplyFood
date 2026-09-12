import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../../common/decorators/roles.decorator';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
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

  async bootstrapOrganization(name: string, email: string, password: string, address?: string, category?: string) {
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new BadRequestException('Organization name is required');
    }

    const user = await this.dataSource.transaction(async (manager) => {
      await manager.query('LOCK TABLE organizations IN SHARE ROW EXCLUSIVE MODE');
      await manager.query('LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE');

      const userRepo = manager.getRepository(User);
      const orgRepo = manager.getRepository(Organization);
      const [userCount, organizationCount] = await Promise.all([userRepo.count(), orgRepo.count()]);
      if (userCount > 0 || organizationCount > 0) {
        throw new BadRequestException('Organization bootstrap is no longer available');
      }
      const existing = await userRepo.findOne({ where: { email } });
      if (existing) {
        throw new BadRequestException('Email already registered');
      }

      const organization = await orgRepo.save(
        orgRepo.create({
          name: normalizedName,
          address: address?.trim() || null,
          category: category?.trim() || null,
        }),
      );

      const passwordHash = await bcrypt.hash(password, 10);
      return userRepo.save(
        userRepo.create({
          email,
          passwordHash,
          role: UserRole.ADMIN,
          orgId: organization.id,
        }),
      );
    });

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

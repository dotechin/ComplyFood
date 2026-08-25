import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
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
    await this.usersService.findByEmail(email);
    return { message: 'If the account exists, a password reset link will be sent.' };
  }
}

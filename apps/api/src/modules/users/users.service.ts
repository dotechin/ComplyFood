import {
  Injectable,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UserRole } from '../../common/decorators/roles.decorator';

export const SUPERMODE_MAX_ATTEMPTS = 3;
const SUPERMODE_BASE_LOCK_MINUTES = 15;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async create(email: string, password: string, role: UserRole = UserRole.STAFF, orgId?: string): Promise<User> {
    const existing = await this.repo.findOne({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.repo.create({ email, passwordHash, role, orgId });
    return this.repo.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  getSupermodeStatus(user: User) {
    const lockedUntil =
      user.supermodeLockedUntil && user.supermodeLockedUntil.getTime() > Date.now()
        ? user.supermodeLockedUntil
        : null;
    return {
      pinSet: Boolean(user.supermodePinHash),
      lockedUntil,
      attemptsLeft: SUPERMODE_MAX_ATTEMPTS - (user.supermodeFailedAttempts ?? 0),
    };
  }

  async getSupermodeStatusById(userId: string) {
    return this.getSupermodeStatus(await this.requireUser(userId));
  }

  async setSupermodePin(userId: string, pin: string, currentPin?: string) {
    const user = await this.requireUser(userId);
    if (user.supermodePinHash) {
      if (!currentPin) throw new BadRequestException('Current PIN is required to change it');
      await this.verifySupermodePin(userId, currentPin);
    }
    user.supermodePinHash = await bcrypt.hash(pin, 10);
    user.supermodeFailedAttempts = 0;
    await this.repo.save(user);
    return this.getSupermodeStatus(user);
  }

  /**
   * Checks the PIN and applies the lockout: after SUPERMODE_MAX_ATTEMPTS wrong tries the
   * account is locked, and each repeat lockout doubles the wait.
   */
  async verifySupermodePin(userId: string, pin: string) {
    const user = await this.requireUser(userId);
    if (!user.supermodePinHash) throw new BadRequestException('Supermode PIN is not set');

    if (user.supermodeLockedUntil && user.supermodeLockedUntil.getTime() > Date.now()) {
      throw new HttpException(
        { message: 'Supermode is locked after too many wrong PINs', lockedUntil: user.supermodeLockedUntil },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const valid = await bcrypt.compare(pin, user.supermodePinHash);
    if (valid) {
      user.supermodeFailedAttempts = 0;
      user.supermodeLockouts = 0;
      user.supermodeLockedUntil = null;
      await this.repo.save(user);
      return this.getSupermodeStatus(user);
    }

    user.supermodeFailedAttempts = (user.supermodeFailedAttempts ?? 0) + 1;
    if (user.supermodeFailedAttempts >= SUPERMODE_MAX_ATTEMPTS) {
      const minutes = SUPERMODE_BASE_LOCK_MINUTES * 2 ** Math.min(user.supermodeLockouts ?? 0, 6);
      user.supermodeLockedUntil = new Date(Date.now() + minutes * 60_000);
      user.supermodeLockouts = (user.supermodeLockouts ?? 0) + 1;
      user.supermodeFailedAttempts = 0;
      await this.repo.save(user);
      throw new HttpException(
        { message: `Too many wrong PINs. Supermode locked for ${minutes} minutes.`, lockedUntil: user.supermodeLockedUntil },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    await this.repo.save(user);
    const left = SUPERMODE_MAX_ATTEMPTS - user.supermodeFailedAttempts;
    throw new UnauthorizedException(`Wrong PIN. ${left} attempt${left === 1 ? '' : 's'} left before lockout.`);
  }

  private async requireUser(id: string) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByOrg(orgId: string): Promise<User[]> {
    return this.repo.find({ where: { orgId }, order: { createdAt: 'ASC' } });
  }

  async updateRole(id: string, orgId: string, role: UserRole): Promise<User> {
    const user = await this.repo.findOne({ where: { id, orgId } });
    if (!user) throw new NotFoundException('User not found');
    user.role = role;
    return this.repo.save(user);
  }

  async setPasswordResetToken(id: string, tokenHash: string | null, expiresAt: Date | null): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpiresAt = expiresAt;
    return this.repo.save(user);
  }

  async findByPasswordResetTokenHash(tokenHash: string): Promise<User | null> {
    return this.repo.findOne({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: MoreThan(new Date()),
      },
    });
  }

  async updatePassword(id: string, password: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    user.passwordHash = await bcrypt.hash(password, 10);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    return this.repo.save(user);
  }
}

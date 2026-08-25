import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UserRole } from '../../common/decorators/roles.decorator';

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

  async findByOrg(orgId: string): Promise<User[]> {
    return this.repo.find({ where: { orgId } });
  }

  async updateRole(id: string, role: UserRole): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    user.role = role;
    return this.repo.save(user);
  }
}

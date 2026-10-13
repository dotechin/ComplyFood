import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { UserRole } from '../../../common/decorators/roles.decorator';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.STAFF })
  role: UserRole;

  @Column({ name: 'org_id', nullable: true })
  orgId: string;

  @Column({ name: 'password_reset_token_hash', nullable: true })
  passwordResetTokenHash: string | null;

  @Column({ name: 'password_reset_expires_at', type: 'timestamptz', nullable: true })
  passwordResetExpiresAt: Date | null;

  @Column({ name: 'supermode_pin_hash', type: 'varchar', nullable: true })
  supermodePinHash: string | null;

  @Column({ name: 'supermode_failed_attempts', type: 'int', default: 0 })
  supermodeFailedAttempts: number;

  @Column({ name: 'supermode_lockouts', type: 'int', default: 0 })
  supermodeLockouts: number;

  @Column({ name: 'supermode_locked_until', type: 'timestamptz', nullable: true })
  supermodeLockedUntil: Date | null;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'org_id' })
  organization: Organization;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

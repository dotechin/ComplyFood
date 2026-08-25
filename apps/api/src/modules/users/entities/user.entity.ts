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

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'org_id' })
  organization: Organization;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

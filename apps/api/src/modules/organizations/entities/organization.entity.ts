import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Location } from './location.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  category: string;

  @OneToMany(() => Location, (loc) => loc.organization)
  locations: Location[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

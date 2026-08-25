import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('consent_records')
export class ConsentRecord {
  @PrimaryGeneratedColumn('uuid') consentId!: string;
  @Column('int', { nullable: true }) userId!: number | null;
  @Column('char', { length: 64, nullable: true }) subjectHash!: string | null;
  @Column('varchar', { length: 24 }) policyVersion!: string;
  @Column('json') categories!: { essential: true; preferences: boolean; analytics: boolean };
  @Column('varchar', { length: 24 }) source!: string;
  @Column('datetime', { nullable: true }) withdrawnAt!: Date | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}

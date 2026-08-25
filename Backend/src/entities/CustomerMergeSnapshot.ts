import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('customer_merge_snapshots')
export class CustomerMergeSnapshot {
  @PrimaryGeneratedColumn('uuid', { name: 'snapshotId' }) snapshotId!: string;
  @Column({ type: 'varchar', length: 36 }) sourceCustomerId!: string;
  @Column({ type: 'varchar', length: 36 }) targetCustomerId!: string;
  @Column({ type: 'json' }) sourceSnapshot!: Record<string, unknown>;
  @Column({ type: 'json' }) targetSnapshot!: Record<string, unknown>;
  @Column({ type: 'int' }) actorUserId!: number;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}

import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('system_capacity_alerts')
export class SystemCapacityAlert {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' }) alertId!: number;
  @Column('varchar', { length: 24 }) provider!: string;
  @Column('varchar', { length: 64 }) resource!: string;
  @Column('tinyint', { unsigned: true }) threshold!: number;
  @Column('varchar', { length: 16 }) periodKey!: string;
  @Column('decimal', { precision: 7, scale: 2, nullable: true }) measuredPercent!: number | null;
  @CreateDateColumn({ type: 'datetime' }) createdAt!: Date;
}

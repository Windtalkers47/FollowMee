import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity('product_funnel_events')
export class ProductFunnelEvent {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' }) eventId!: number;
  @Column('varchar', { length: 32 }) eventType!: string;
  @Column('char', { length: 64 }) sessionHash!: string;
  @Column('int', { nullable: true }) userId!: number | null;
  @Column('json', { nullable: true }) metadata!: Record<string, unknown> | null;
  @CreateDateColumn({ type: 'datetime' }) occurredAt!: Date;
}

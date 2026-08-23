import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('history')
export class HistoryEntity {
  @PrimaryColumn({ type: 'varchar' })
  public id!: string;

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  public timestamp!: string;

  @Index()
  @Column({ type: 'varchar' })
  public type!: 'area' | 'list';

  @Column({ type: 'jsonb' })
  public parameters!: Record<string, any>;

  @Index()
  @Column({ type: 'varchar' })
  public status!: 'SUCCESS' | 'FAILED';

  @Column({ type: 'text', nullable: true })
  public responseMessage?: string;
}

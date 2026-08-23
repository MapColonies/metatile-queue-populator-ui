import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryColumn({ type: 'varchar' })
  public id!: string;

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  public timestamp!: string;

  @Index()
  @Column({ type: 'varchar', length: 10 })
  public method!: string;

  @Index()
  @Column({ type: 'varchar' })
  public path!: string;

  @Index()
  @Column({ type: 'int' })
  public statusCode!: number;

  @Column({ type: 'int' })
  public durationMs!: number;

  @Column({ type: 'varchar', nullable: true })
  public clientIp?: string;

  @Column({ type: 'varchar', nullable: true })
  public userAgent?: string;

  @Column({ type: 'jsonb', nullable: true })
  public requestBody?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  public queryParams?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  public details?: string;
}

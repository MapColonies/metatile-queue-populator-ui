import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('presets')
export class PresetEntity {
  @PrimaryColumn({ type: 'varchar' })
  public id!: string;

  @Column({ type: 'varchar' })
  public name!: string;

  @Column({ type: 'varchar', nullable: true })
  public category?: string;

  @Column({ type: 'varchar', nullable: true })
  public continent?: string;

  @Column({ type: 'varchar', nullable: true })
  public subregion?: string;

  @Column({ type: 'text', nullable: true })
  public description?: string;

  @Column({ type: 'integer' })
  public minZoom!: number;

  @Column({ type: 'integer' })
  public maxZoom!: number;

  @Column({ type: 'integer', default: 0 })
  public priority!: number;

  @Column({ type: 'jsonb' })
  public area!: [number, number, number, number] | Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  public createdAt!: string;
}

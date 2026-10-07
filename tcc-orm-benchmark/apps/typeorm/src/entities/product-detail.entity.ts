import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';

import { Product } from './product.entity.js';

@Entity({ name: 'product_details' })
export class ProductDetail {
  @PrimaryColumn({ name: 'product_id', type: 'bigint' })
  productId!: string;

  @Column({ name: 'weight_kg', type: 'numeric', precision: 8, scale: 3, nullable: true })
  weightKg!: string | null;

  @Column({ name: 'width_cm', type: 'numeric', precision: 8, scale: 2, nullable: true })
  widthCm!: string | null;

  @Column({ name: 'height_cm', type: 'numeric', precision: 8, scale: 2, nullable: true })
  heightCm!: string | null;

  @Column({ name: 'depth_cm', type: 'numeric', precision: 8, scale: 2, nullable: true })
  depthCm!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  manufacturer!: string | null;

  @Column({ name: 'warranty_months', type: 'integer', nullable: true })
  warrantyMonths!: number | null;

  @OneToOne(() => Product, (product) => product.details, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id', foreignKeyConstraintName: 'fk_product_details_product' })
  product!: Product;
}

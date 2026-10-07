import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Category } from './category.entity.js';
import { OrderItem } from './order-item.entity.js';
import { ProductDetail } from './product-detail.entity.js';

@Entity({ name: 'products' })
@Index('idx_products_category_id', ['categoryId'])
@Index('idx_products_price', ['price'])
export class Product {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'category_id', type: 'bigint' })
  categoryId!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  price!: string;

  @Column({ type: 'integer', default: 0 })
  stock!: number;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Category, (category) => category.products)
  @JoinColumn({ name: 'category_id', foreignKeyConstraintName: 'fk_products_category' })
  category!: Category;

  @OneToOne(() => ProductDetail, (details) => details.product)
  details!: ProductDetail | null;

  @OneToMany(() => OrderItem, (item) => item.product)
  orderItems!: OrderItem[];
}

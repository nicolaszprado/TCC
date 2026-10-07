import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Customer } from './customer.entity.js';
import { OrderItem } from './order-item.entity.js';

@Entity({ name: 'orders' })
@Index('idx_orders_customer_id', ['customerId'])
@Index('idx_orders_created_at', ['createdAt'])
@Index('idx_orders_customer_created_at', ['customerId', 'createdAt'])
export class Order {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'customer_id', type: 'bigint' })
  customerId!: string;

  @Column({ type: 'varchar', length: 30 })
  status!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Customer, (customer) => customer.orders)
  @JoinColumn({ name: 'customer_id', foreignKeyConstraintName: 'fk_orders_customer' })
  customer!: Customer;

  @OneToMany(() => OrderItem, (item) => item.order)
  items!: OrderItem[];
}

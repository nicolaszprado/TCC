export type ProductRow = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;
};

export type ProductResponse = {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

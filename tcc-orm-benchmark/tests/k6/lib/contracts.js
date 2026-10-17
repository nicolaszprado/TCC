export const statuses = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const id = (v) => Number.isSafeInteger(v) && v > 0;
const date = (v) => typeof v === 'string' && Number.isFinite(Date.parse(v));
const decimal = (v) => typeof v === 'string' && /^\d+(\.\d+)?$/.test(v);

export function product(p) {
  return !!p && id(p.id) && id(p.categoryId) && typeof p.name === 'string'
    && decimal(p.price) && Number.isInteger(p.stock) && p.stock >= 0
    && typeof p.active === 'boolean' && date(p.createdAt) && date(p.updatedAt);
}

export function details(p) {
  const d = p?.details;
  return product(p) && !!d && ['weightKg', 'widthCm', 'heightCm', 'depthCm']
    .every((key) => d[key] === null || decimal(d[key]))
    && (d.manufacturer === null || typeof d.manufacturer === 'string')
    && (d.warrantyMonths === null || (Number.isInteger(d.warrantyMonths) && d.warrantyMonths >= 0));
}

export function order(o) {
  return !!o && id(o.id) && statuses.includes(o.status) && date(o.createdAt) && date(o.updatedAt)
    && id(o.customer?.id) && typeof o.customer.name === 'string' && typeof o.customer.email === 'string'
    && Array.isArray(o.items) && o.items.length > 0
    && o.items.every((i) => id(i.id) && id(i.quantity) && decimal(i.unitPrice)
      && id(i.product?.id) && typeof i.product.name === 'string');
}

export function pagination(p, rows, page, limit, total) {
  return !!p && Array.isArray(rows) && rows.length > 0 && rows.length <= limit
    && p.page === page && p.limit === limit && p.total === total
    && p.totalPages === Math.ceil(total / limit)
    && rows.length === Math.min(limit, total - (page - 1) * limit);
}

export function customerOrders(b, customerId, page, limit, total) {
  return b?.customer?.id === customerId && typeof b.customer.name === 'string'
    && typeof b.customer.email === 'string' && date(b.customer.createdAt)
    && pagination(b.pagination, b.orders, page, limit, total)
    && b.orders.every((o) => id(o.id) && o.customerId === customerId
      && statuses.includes(o.status) && date(o.createdAt) && date(o.updatedAt));
}

export function createdOrder(b, payload, prices) {
  return order(b) && b.status === 'PENDING' && b.customer.id === payload.customerId
    && b.items.length === payload.items.length
    && new Set(b.items.map((i) => i.product.id)).size === payload.items.length
    && payload.items.every((sent) => b.items.some((received) => received.product.id === sent.productId
      && received.quantity === sent.quantity && Number(received.unitPrice) === Number(prices[sent.productId])));
}

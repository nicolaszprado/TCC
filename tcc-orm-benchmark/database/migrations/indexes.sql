CREATE INDEX idx_products_category_id
    ON products(category_id);


CREATE INDEX idx_products_price
    ON products(price);


CREATE INDEX idx_orders_customer_id
    ON orders(customer_id);


CREATE INDEX idx_orders_created_at
    ON orders(created_at);


CREATE INDEX idx_orders_customer_created_at
    ON orders(customer_id, created_at DESC);


CREATE INDEX idx_order_items_order_id
    ON order_items(order_id);


CREATE INDEX idx_order_items_product_id
    ON order_items(product_id);
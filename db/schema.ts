import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  data: text("data").notNull(),
});
export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  data: text("data").notNull(),
});
export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  created: integer("created").notNull(),
  status: text("status").notNull(),
  customer: text("customer").notNull(),
  subtotal: integer("subtotal").notNull(),
  fee: integer("fee").notNull(),
  payment: text("payment").notNull(),
  gateway: text("gateway"),
});
export const lines = sqliteTable("order_items", {
  id: integer("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id),
  product: text("product").notNull(),
  name: text("name").notNull(),
  variant: text("variant").notNull(),
  qty: integer("qty").notNull(),
  price: integer("price").notNull(),
});

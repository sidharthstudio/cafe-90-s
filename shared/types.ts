export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready for Delivery",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export type Variant = {
  id: number;
  productId: number;
  label: string;
  price: number;
  sort: number;
};

export type Product = {
  id: number;
  slug: string;
  name: string;
  description: string;
  image: string;
  portion: string;
  tags: string[];
  available: boolean;
  featured: boolean;
  bestseller: boolean;
  sort: number;
  categoryId: number;
  categorySlug: string;
  categoryName: string;
  variants: Variant[];
};

export type Category = {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  tint: string;
  image: string;
  sort: number;
};

export type MenuCategory = Category & { products: Product[] };

export type Offer = {
  id: number;
  title: string;
  description: string;
  code: string;
  discountType: "percent" | "flat";
  discountValue: number;
  minOrder: number;
  image: string;
  active: boolean;
  badge: string;
};

export type EventItem = {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  image: string;
  active: boolean;
};

export type Review = {
  id: number;
  name: string;
  rating: number;
  text: string;
  approved: boolean;
  createdAt: string;
};

export type GalleryItem = {
  id: number;
  image: string;
  caption: string;
  sort: number;
};

export type OpeningHour = { day: string; open: string; close: string; closed?: boolean };

export type Settings = {
  cafeName: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  mapUrl: string;
  mapEmbedUrl: string;
  instagram: string;
  facebook: string;
  hours: OpeningHour[];
  cafeLat: number;
  cafeLng: number;
  freeRadiusKm: number;
  maxRadiusKm: number;
  outsideFee: number;
  outsideDeliveryAllowed: boolean;
  deliveryEnabled: boolean;
  minOrderValue: number;
  prepTime: string;
  announcement: string;
  heroHeadline: string;
  heroSubline: string;
  onlinePaymentEnabled: boolean;
};

export type OrderItemPayload = {
  productId: number;
  variantId?: number;
  qty: number;
  notes?: string;
};

export type OrderItem = {
  id: number;
  productId: number | null;
  name: string;
  variantLabel: string;
  unitPrice: number;
  qty: number;
  notes: string;
  image: string;
};

export type Order = {
  id: number;
  code: string;
  customerName: string;
  phone: string;
  house: string;
  area: string;
  landmark: string;
  address: string;
  instructions: string;
  notes: string;
  lat: number | null;
  lng: number | null;
  distanceKm: number | null;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  couponCode: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

export type DeliveryCheck = {
  distanceKm: number | null;
  inZone: boolean;
  allowed: boolean;
  fee: number;
  message: string;
  freeRadiusKm: number;
  maxRadiusKm: number;
  deliveryEnabled: boolean;
  minOrderValue: number;
};

export type AdminStats = {
  totalOrders: number;
  newOrders: number;
  pendingOrders: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalSales: number;
  todayOrders: number;
  todaySales: number;
  avgOrderValue: number;
  popular: { name: string; qty: number; revenue: number }[];
  recent: Order[];
  daily: { day: string; orders: number; sales: number }[];
};

export type AdminUser = { id: number; email: string; name: string; role: string };

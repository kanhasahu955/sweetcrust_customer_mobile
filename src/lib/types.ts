import { money, formatMoney } from "./theme";

export type Product = {
  id: number;
  name: string;
  brand_name?: string | null;
  supplier_user_id?: number | null;
  selling_price?: number;
  customer_price?: number;
  original_price?: number | null;
  discount_percent?: number;
  short_description?: string | null;
  description?: string | null;
  cover_image_url?: string | null;
  category_id?: number;
  flavor?: string | null;
  weight?: string | null;
  available_sizes?: string[] | null;
  available_flavors?: string[] | null;
  ingredients?: string | null;
  allergens?: string | null;
  is_eggless?: boolean;
  is_favorite?: boolean;
  rating_avg?: number;
  rating?: number;
  rating_count?: number;
  review_count?: number;
  estimated_delivery_mins?: number;
};

export type CartItem = {
  id: number;
  product_id: number;
  product_name: string;
  product_image?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  variant?: string | null;
  flavor?: string | null;
};

export type CartSummary = {
  cart_id?: number;
  shop_user_id?: number | null;
  shop_name?: string | null;
  items: CartItem[];
  saved_for_later?: { id: number; product_id: number; quantity: number }[];
  coupon_code?: string | null;
  subtotal: number;
  discount: number;
  gst: number;
  delivery_fee: number;
  final_total: number;
};

export type ShopCard = {
  user_id: number;
  shop_name: string;
  shop_logo_url?: string | null;
  village?: string | null;
  area?: string | null;
  city?: string | null;
  is_open?: boolean;
  product_count?: number;
};

export type Address = {
  id: number;
  label?: string | null;
  full_name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  is_default?: boolean;
};

export type Order = {
  id: number;
  order_number?: string;
  status?: string;
  payment_status?: string;
  payment_method?: string | null;
  subtotal?: number;
  discount?: number;
  gst_amount?: number;
  delivery_fee?: number;
  final_amount?: number;
  delivery_date?: string | null;
  delivery_slot?: string | null;
  customer_phone?: string | null;
  rating?: number | null;
  created_at?: string;
};

export type AuthUser = {
  id: number;
  phone: string;
  name?: string | null;
  email?: string | null;
  role: string;
  language?: string;
  avatar_url?: string | null;
  is_guest?: boolean;
};

export { money, formatMoney };

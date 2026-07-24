/** Standalone API client — copy lives in each app (no shared package). */

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  message?: string | null;
  is_new?: boolean | null;
  user?: {
    id: number;
    phone: string;
    name?: string | null;
    email?: string | null;
    role: string;
    language?: string;
    avatar_url?: string | null;
    is_guest?: boolean;
  };
};

export type TokenStore = {
  getAccess(): Promise<string | null> | string | null;
  getRefresh(): Promise<string | null> | string | null;
  setTokens(access: string, refresh: string): Promise<void> | void;
  clear(): Promise<void> | void;
};

export type CartItemIn = {
  product_id: number;
  quantity?: number;
  variant?: string | null;
  flavor?: string | null;
  is_eggless?: boolean;
};

export type CartItemUpdateIn = {
  quantity?: number;
  saved_for_later?: boolean;
};

export type AddressIn = {
  label?: string;
  full_name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city?: string;
  state?: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  is_default?: boolean;
};

export type CheckoutIn = {
  address_id: number;
  delivery_date: string;
  delivery_slot: string;
  customer_phone: string;
  delivery_instructions?: string | null;
  contactless?: boolean;
  payment_method: string;
  coupon_code?: string | null;
};

export type PaymentConfirmIn = {
  order_id: number;
  method: string;
  upi_id?: string | null;
  simulate_failure?: boolean;
};

export type ProductQuery = {
  category_id?: number;
  brand_name?: string;
  supplier_user_id?: number;
  q?: string;
  min_price?: number;
  max_price?: number;
  flavor?: string;
  weight?: string;
  eggless?: boolean;
  sugar_free?: boolean;
  min_rating?: number;
  same_day?: boolean;
  in_stock?: boolean;
  offers?: boolean;
  sort?: string;
  page?: number;
  page_size?: number;
};

export type CustomCakeIn = {
  occasion: string;
  cake_type: string;
  flavor: string;
  weight: string;
  shape: string;
  is_eggless?: boolean;
  cream_type?: string | null;
  decoration_theme?: string | null;
  reference_image_url?: string | null;
  cake_message?: string | null;
  special_instructions?: string | null;
  delivery_date?: string | null;
  delivery_time?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
};

export type ReturnIn = {
  order_id: number;
  affected_item_ids: number[];
  issue_type: string;
  solution: string;
  description?: string | null;
  evidence_urls?: string[] | null;
};

function formatApiDetail(body: unknown, status: number): string {
  if (typeof body === "object" && body) {
    const b = body as { detail?: unknown; message?: unknown };
    const d = b.detail ?? b.message;
    if (typeof d === "string" && d.trim()) return d;
    if (Array.isArray(d)) {
      return d
        .map((x) =>
          typeof x === "object" && x && "msg" in x
            ? String((x as { msg: unknown }).msg)
            : typeof x === "string"
              ? x
              : JSON.stringify(x)
        )
        .filter(Boolean)
        .join("; ");
    }
  }
  return `HTTP ${status}`;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(formatApiDetail(body, status));
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function resolve(v: Promise<string | null> | string | null) {
  return await v;
}

function toQuery(params?: ProductQuery | Record<string, unknown>) {
  if (!params) return "";
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export function createApiClient(opts: { baseUrl?: string; tokenStore?: TokenStore } = {}) {
  const baseUrl = (opts.baseUrl || "http://127.0.0.1:8080").replace(/\/$/, "");
  const store = opts.tokenStore;

  async function raw(path: string, init: RequestInit = {}, retried = false): Promise<Response> {
    const headers = new Headers(init.headers || {});
    const isForm =
      typeof FormData !== "undefined" && typeof init.body === "object" && init.body instanceof FormData;
    if (!headers.has("Content-Type") && init.body && !isForm) {
      headers.set("Content-Type", "application/json");
    }
    const access = store ? await resolve(store.getAccess()) : null;
    if (access) headers.set("Authorization", `Bearer ${access}`);

    const isAuth = path.includes("/auth/");
    const timeoutMs = isAuth ? 12_000 : 30_000;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(`${baseUrl}${path}`, { ...init, headers, signal: init.signal || ctrl.signal });
    } catch (e) {
      clearTimeout(timer);
      if (e instanceof Error && e.name === "AbortError") {
        throw new ApiError(408, { detail: `Request timed out. Is the API reachable at ${baseUrl}?` });
      }
      throw new ApiError(0, {
        detail: e instanceof Error ? e.message : `Network error talking to ${baseUrl}`,
      });
    }
    clearTimeout(timer);

    if (res.status === 401 && store && !retried && !path.includes("/auth/")) {
      const refresh = await resolve(store.getRefresh());
      if (refresh) {
        const refreshed = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
        });
        if (refreshed.ok) {
          const data = (await refreshed.json()) as TokenPair;
          await store.setTokens(data.access_token, data.refresh_token);
          return raw(path, init, true);
        }
        await store.clear();
      }
    }
    return res;
  }

  async function json<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await raw(path, init);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, body);
    // Many backend_v2 services wrap payloads as { success: true, data }
    if (
      body
      && typeof body === "object"
      && (body as { success?: unknown }).success === true
      && "data" in (body as object)
    ) {
      return (body as { data: T }).data;
    }
    return body as T;
  }

  return {
    baseUrl,
    auth: {
      sendOtp: (phone: string, purpose = "login") =>
        json<{ phone: string; message: string; dev_otp?: string | null; sms_sent?: boolean }>(
          "/api/v1/auth/otp/send",
          { method: "POST", body: JSON.stringify({ phone, purpose }) }
        ),
      verifyOtp: (phone: string, code: string, extra: Record<string, unknown> = {}) =>
        json<TokenPair>("/api/v1/auth/otp/verify", {
          method: "POST",
          body: JSON.stringify({ phone, code, terms_accepted: true, ...extra }),
        }),
      google: (id_token: string) =>
        json<TokenPair>("/api/v1/auth/google", {
          method: "POST",
          body: JSON.stringify({ id_token, terms_accepted: true }),
        }),
      googleFinish: (code: string) =>
        json<TokenPair>("/api/v1/auth/google/finish", {
          method: "POST",
          body: JSON.stringify({ code }),
        }),
      guest: () => json<TokenPair>("/api/v1/auth/guest", { method: "POST", body: "{}" }),
      refresh: (refresh_token: string) =>
        json<TokenPair>("/api/v1/auth/refresh", {
          method: "POST",
          body: JSON.stringify({ refresh_token }),
        }),
      logout: (refresh_token?: string) =>
        json("/api/v1/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refresh_token }),
        }),
      me: () => json<{ id: number; phone: string; name?: string | null; role: string }>("/api/v1/auth/me"),
      updateMe: (body: { name?: string; email?: string; language?: string; avatar_url?: string }) =>
        json("/api/v1/auth/me", { method: "PATCH", body: JSON.stringify(body) }),
    },
    customer: {
      home: () => json("/api/v1/customer/home"),
      settings: () =>
        json<{
          bakery_name?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          latitude?: number | null
          longitude?: number | null
          delivery_slots?: string[]
          delivery_charge?: number | null
          free_delivery_min?: number | null
          min_order_value?: number | null
          cod_enabled?: boolean
          upi_id?: string | null
        }>("/api/v1/customer/settings"),
      categories: () => json("/api/v1/customer/categories"),
      brands: () => json<{ name: string }[]>("/api/v1/customer/brands"),
      shops: () => json<Record<string, unknown>[]>("/api/v1/customer/shops"),
      shop: (shopUserId: number) =>
        json<Record<string, unknown>>(`/api/v1/customer/shops/${shopUserId}`),
      products: (query?: ProductQuery) =>
        json<{ items: unknown[]; total: number }>(`/api/v1/customer/products${toQuery(query)}`),
      product: (id: number) =>
        json<{ product: Record<string, unknown>; images: unknown[]; reviews: unknown[]; similar: unknown[] }>(
          `/api/v1/customer/products/${id}`
        ),
      favorite: (productId: number) =>
        json(`/api/v1/customer/products/${productId}/favorite`, { method: "POST", body: "{}" }),
      review: (productId: number, body: { rating: number; comment?: string; order_id?: number }) =>
        json(`/api/v1/customer/products/${productId}/reviews`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      cart: () => json("/api/v1/customer/cart"),
      addCartItem: (body: CartItemIn) =>
        json("/api/v1/customer/cart/items", { method: "POST", body: JSON.stringify(body) }),
      updateCartItem: (itemId: number, body: CartItemUpdateIn) =>
        json(`/api/v1/customer/cart/items/${itemId}`, { method: "PATCH", body: JSON.stringify(body) }),
      removeCartItem: (itemId: number) =>
        json(`/api/v1/customer/cart/items/${itemId}`, { method: "DELETE" }),
      applyCoupon: (code: string) =>
        json("/api/v1/customer/cart/coupon", { method: "POST", body: JSON.stringify({ code }) }),
      addresses: () => json("/api/v1/customer/addresses"),
      addAddress: (body: AddressIn) =>
        json("/api/v1/customer/addresses", { method: "POST", body: JSON.stringify(body) }),
      deleteAddress: (addressId: number) =>
        json(`/api/v1/customer/addresses/${addressId}`, { method: "DELETE" }),
      deliveryCheck: (lat: number, lng: number) =>
        json<{
          deliverable?: boolean;
          distance_km?: number;
          max_km?: number;
          detail?: string;
        }>("/api/v1/customer/delivery/check", {
          method: "POST",
          body: JSON.stringify({ lat, lng }),
        }),
      checkout: (body: CheckoutIn) =>
        json<{ order: { id: number; order_number?: string }; message?: string }>("/api/v1/customer/checkout", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      confirmPayment: (body: PaymentConfirmIn) =>
        json("/api/v1/customer/payments/confirm", { method: "POST", body: JSON.stringify(body) }),
      paymentMethods: () => json<{ methods: string[]; upi_id?: string }>("/api/v1/customer/payments/methods"),
      orders: (tab = "active") =>
        json<{ items: unknown[]; tab: string }>(`/api/v1/customer/orders?tab=${encodeURIComponent(tab)}`),
      order: (orderId: number) => json(`/api/v1/customer/orders/${orderId}`),
      trackOrder: (orderId: number) => json(`/api/v1/customer/orders/${orderId}/track`),
      invoice: (orderId: number) => json(`/api/v1/customer/orders/${orderId}/invoice`),
      cancelOrder: (orderId: number, reason = "Changed mind") =>
        json(`/api/v1/customer/orders/${orderId}/cancel?reason=${encodeURIComponent(reason)}`, {
          method: "POST",
        }),
      rateOrder: (orderId: number, body: { rating: number; comment?: string }) =>
        json(`/api/v1/customer/orders/${orderId}/rate`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      reorder: (orderId: number) =>
        json(`/api/v1/customer/orders/${orderId}/reorder`, { method: "POST" }),
      customCakes: () => json("/api/v1/customer/custom-cakes"),
      createCustomCake: (body: CustomCakeIn) =>
        json("/api/v1/customer/custom-cakes", { method: "POST", body: JSON.stringify(body) }),
      returns: () => json("/api/v1/customer/returns"),
      createReturn: (body: ReturnIn) =>
        json("/api/v1/customer/returns", { method: "POST", body: JSON.stringify(body) }),
      returnOne: (returnId: number) => json(`/api/v1/customer/returns/${returnId}`),
      chats: () => json<unknown[]>("/api/v1/customer/chats"),
      createChat: (body: {
        category?: string;
        order_id?: number;
        return_id?: number;
        custom_cake_id?: number;
        is_ai?: boolean;
        initial_message?: string;
      } = {}) =>
        json<Record<string, unknown>>("/api/v1/customer/chats", {
          method: "POST",
          body: JSON.stringify({
            category: body.category || "general",
            order_id: body.order_id ?? null,
            return_id: body.return_id ?? null,
            custom_cake_id: body.custom_cake_id ?? null,
            is_ai: Boolean(body.is_ai),
            initial_message: body.initial_message ?? null,
          }),
        }),
      chatMessages: (id: number) => json<unknown[]>(`/api/v1/customer/chats/${id}/messages`),
      sendChatMessage: (
        id: number,
        body: { content?: string; message_type?: string; media_url?: string; metadata_json?: unknown }
      ) =>
        json(`/api/v1/customer/chats/${id}/messages`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      aiChat: (message: string, conversation_id?: number, language = "en") =>
        json<Record<string, unknown>>("/api/v1/customer/ai/chat", {
          method: "POST",
          body: JSON.stringify({ message, conversation_id, language }),
        }),
      startCall: (body: { callee_id?: number; order_id?: number; call_type?: string; target?: string } = {}) =>
        json("/api/v1/customer/calls", {
          method: "POST",
          body: JSON.stringify({
            callee_id: body.callee_id ?? null,
            order_id: body.order_id ?? null,
            call_type: body.call_type || "internet_audio",
            target: body.target || "bakery",
          }),
        }),
      updateCall: (callId: number, body: { status: string; duration_seconds?: number; notes?: string }) =>
        json(`/api/v1/customer/calls/${callId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      calls: () => json("/api/v1/customer/calls"),
      notifications: (unreadOnly = false) =>
        json(`/api/v1/customer/notifications?unread_only=${unreadOnly ? "true" : "false"}`),
      readNotifications: (notificationId?: number) =>
        json(
          `/api/v1/customer/notifications/read${notificationId != null ? `?notification_id=${notificationId}` : ""}`,
          { method: "POST", body: "{}" }
        ),
      faqs: () => json("/api/v1/customer/faqs"),
      profileSummary: () => json("/api/v1/customer/profile/summary"),
      wallet: () => json("/api/v1/customer/wallet"),
      walletAdd: (amount: number, method = "UPI") =>
        json(`/api/v1/customer/wallet/add?amount=${amount}&method=${encodeURIComponent(method)}`, {
          method: "POST",
          body: "{}",
        }),
      referral: () => json("/api/v1/customer/referral"),
      referralApply: (code: string) =>
        json(`/api/v1/customer/referral/apply?code=${encodeURIComponent(code)}`, { method: "POST", body: "{}" }),
      subscriptions: () => json("/api/v1/customer/subscriptions"),
      subscribe: (planId: number) =>
        json(`/api/v1/customer/subscriptions/${planId}`, { method: "POST", body: "{}" }),
      giftHampers: () => json("/api/v1/customer/gift-hampers"),
      corporate: (body: Record<string, unknown>) =>
        json("/api/v1/customer/corporate", { method: "POST", body: JSON.stringify(body) }),
      shareTrack: (orderId: number) =>
        json(`/api/v1/customer/orders/${orderId}/share-track`, { method: "POST", body: "{}" }),
      publicTrack: (token: string) => json(`/api/v1/customer/track/share/${encodeURIComponent(token)}`),
    },
    payments: {
      methods: () =>
        json<{
          methods: string[];
          upi_id?: string | null;
          razorpay?: { configured?: boolean; key_id?: string | null };
        }>("/api/v1/payments/methods"),
      razorpayCreate: (orderId: number, use_payment_link = true) =>
        json<{
          status: string;
          order_id: number;
          short_url?: string;
          payment_link?: { short_url?: string };
          id?: string;
        }>("/api/v1/payments/razorpay/create", {
          method: "POST",
          body: JSON.stringify({ order_id: orderId, use_payment_link }),
        }),
      razorpayVerify: (body: {
        order_id: number;
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) =>
        json("/api/v1/payments/razorpay/verify", {
          method: "POST",
          body: JSON.stringify(body),
        }),
    },
    geo: {
      suggest: (q: string, limit = 6, sessionToken?: string) => {
        const qs = new URLSearchParams({ q, limit: String(limit) });
        if (sessionToken) qs.set("session_token", sessionToken);
        return json<unknown[]>(`/api/v1/geo/suggest?${qs}`);
      },
      place: (placeId: string, sessionToken?: string) => {
        const qs = sessionToken ? `?session_token=${encodeURIComponent(sessionToken)}` : "";
        return json<Record<string, unknown>>(`/api/v1/geo/place/${encodeURIComponent(placeId)}${qs}`);
      },
      reverse: (lat: number, lng: number) =>
        json<Record<string, unknown>>(`/api/v1/geo/reverse?lat=${lat}&lng=${lng}`),
      pincode: (pin: string) => json<Record<string, unknown>>(`/api/v1/geo/pincode/${encodeURIComponent(pin)}`),
    },
    uploads: {
      file: async (uri: string, purpose = "chat", filename = "photo.jpg") => {
        const form = new FormData();
        form.append("purpose", purpose);
        form.append("folder", "sweetcrust");
        form.append("file", { uri, name: filename, type: "image/jpeg" } as unknown as Blob);
        const res = await raw("/api/v1/uploads", { method: "POST", body: form });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !(body as { success?: boolean }).success) {
          throw new ApiError(res.status || 400, body.detail ? body : { detail: "Upload failed" });
        }
        return body as { url: string; success: boolean };
      },
    },
  };
}

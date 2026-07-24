import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  api,
  clearSession,
  getStoredUser,
  hydrateSession,
  persistLogin,
  updateStoredUser,
} from "@/lib/api";
import type { TokenPair } from "@/lib/api-client";
import type { AuthUser, CartSummary, Order, Product } from "@/lib/types";

type HomeFeed = {
  categories?: { id: number; name: string; image_url?: string | null }[];
  banners?: {
    id: number;
    title: string;
    subtitle?: string | null;
    image_url?: string;
    link_type?: string | null;
    link_value?: string | null;
    shop_user_id?: number | null;
  }[];
  bestsellers?: Product[];
  freshly_baked?: Product[];
  trending?: Product[];
  festival_offers?: Product[];
  recommended?: Product[];
  recently_viewed?: Product[];
  customized_cake_banner?: { title: string; subtitle?: string; cta?: string };
};

type AppCtx = {
  ready: boolean;
  authed: boolean;
  user: AuthUser | null;
  busy: boolean;
  error: string | null;
  msg: string | null;
  cart: CartSummary | null;
  cartCount: number;
  home: HomeFeed | null;
  orders: Order[];
  setError: (e: string | null) => void;
  setMsg: (m: string | null) => void;
  refreshCart: () => Promise<void>;
  refreshHome: () => Promise<void>;
  refreshOrders: (tab?: string) => Promise<void>;
  refresh: () => Promise<void>;
  afterLogin: (tokens: TokenPair) => Promise<void>;
  setUser: (u: AuthUser | null) => void;
  logout: () => Promise<void>;
};

const Ctx = createContext<AppCtx | null>(null);

const EMPTY_CART: CartSummary = {
  items: [],
  subtotal: 0,
  discount: 0,
  gst: 0,
  delivery_fee: 0,
  final_total: 0,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [home, setHome] = useState<HomeFeed | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  const refreshCart = useCallback(async () => {
    if (typeof api.customer?.cart !== "function") return;
    const data = (await api.customer.cart()) as CartSummary;
    const items = Array.isArray(data?.items) ? data.items : [];
    setCart({ ...EMPTY_CART, ...data, items });
  }, []);

  const refreshHome = useCallback(async () => {
    if (typeof api.customer?.home !== "function") return;
    const data = (await api.customer.home()) as HomeFeed;
    setHome(data);
  }, []);

  const refreshOrders = useCallback(async (tab = "active") => {
    if (typeof api.customer?.orders !== "function") return;
    const data = await api.customer.orders(tab);
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    setOrders(items as Order[]);
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    await Promise.allSettled([refreshCart(), refreshHome(), refreshOrders("active")]);
  }, [refreshCart, refreshHome, refreshOrders]);

  useEffect(() => {
    (async () => {
      const ok = await hydrateSession();
      setAuthed(ok);
      setUser(getStoredUser());
      if (ok) {
        try {
          await Promise.all([refreshCart(), refreshHome(), refreshOrders("active")]);
        } catch {
          await clearSession();
          setAuthed(false);
          setUser(null);
          setCart(null);
          setHome(null);
          setOrders([]);
        }
      }
      setReady(true);
    })();
  }, [refreshCart, refreshHome, refreshOrders]);

  const afterLogin = useCallback(
    async (tokens: TokenPair) => {
      setBusy(true);
      setError(null);
      try {
        await persistLogin(tokens);
        setUser(tokens.user ? (tokens.user as AuthUser) : getStoredUser());
        setAuthed(true);
        // Don't fail login if cart/home refresh blows up
        await Promise.allSettled([refreshCart(), refreshHome(), refreshOrders("active")]);
      } finally {
        setBusy(false);
      }
    },
    [refreshCart, refreshHome, refreshOrders]
  );

  const logout = useCallback(async () => {
    await clearSession();
    setAuthed(false);
    setUser(null);
    setCart(null);
    setHome(null);
    setOrders([]);
    setMsg(null);
    setError(null);
  }, []);

  // Stable — never recreate inside useMemo or screens that depend on setUser
  // will re-fire useFocusEffect in a loop (UI "shaking").
  const setUserPersist = useCallback((u: AuthUser | null) => {
    setUser((prev) => {
      if (
        prev &&
        u &&
        prev.id === u.id &&
        prev.name === u.name &&
        prev.email === u.email &&
        prev.phone === u.phone &&
        prev.avatar_url === u.avatar_url
      ) {
        return prev;
      }
      if (u) updateStoredUser(u).catch(() => undefined);
      return u;
    });
  }, []);

  const cartItems = Array.isArray(cart?.items) ? cart.items : [];
  const cartCount = cartItems.reduce((n, i) => n + (Number(i?.quantity) || 0), 0);

  const value = useMemo(
    () => ({
      ready,
      authed,
      user,
      busy,
      error,
      msg,
      cart: cart || EMPTY_CART,
      cartCount,
      home,
      orders,
      setError,
      setMsg,
      refreshCart,
      refreshHome,
      refreshOrders,
      refresh,
      afterLogin,
      setUser: setUserPersist,
      logout,
    }),
    [
      ready,
      authed,
      user,
      busy,
      error,
      msg,
      cart,
      cartCount,
      home,
      orders,
      refreshCart,
      refreshHome,
      refreshOrders,
      refresh,
      afterLogin,
      setUserPersist,
      logout,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp outside AppProvider");
  return ctx;
}

import { useCallback, useEffect, useState } from "react";
import { Tabs } from "expo-router";

import { FloatingTabBar } from "@/components/ui/FloatingTabBar";
import { useApp } from "@/context/app";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

export default function TabsLayout() {
  const { authed } = useApp();
  const [chatUnread, setChatUnread] = useState(0);

  const renderTabBar = useCallback((props: any) => <FloatingTabBar {...props} />, []);

  useEffect(() => {
    if (!authed) {
      setChatUnread(0);
      return;
    }
    let stop = false;
    const tick = async () => {
      try {
        const rows = (await api.customer.chats()) as { unread_customer?: number }[];
        if (stop || !Array.isArray(rows)) return;
        const next = rows.reduce((n, r) => n + (Number(r.unread_customer) || 0), 0);
        setChatUnread((prev) => (prev === next ? prev : next));
      } catch {
        /* ignore */
      }
    };
    tick();
    const t = setInterval(tick, 15000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [authed]);

  return (
    <Tabs
      tabBar={renderTabBar}
      screenOptions={{
        headerShown: false,
        animation: "none",
        sceneStyle: { backgroundColor: colors.cream, paddingBottom: 0 },
        // Prevent default white tab strip under the custom wavy dock
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="categories" options={{ title: "Categories" }} />
      <Tabs.Screen name="orders" options={{ title: "Orders" }} />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarBadge: chatUnread > 0 ? chatUnread : undefined,
        }}
      />
      <Tabs.Screen name="account" options={{ title: "Profile" }} />
      {/* Product listing — opened from Categories / Home search, hidden from tab bar */}
      <Tabs.Screen name="catalog" options={{ href: null, title: "Shop" }} />
    </Tabs>
  );
}

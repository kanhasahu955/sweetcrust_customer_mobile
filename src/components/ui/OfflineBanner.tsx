import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { OfflineScreen } from "@/components/ui/OfflineScreen";
import { colors, fonts, radius, space } from "@/lib/theme";

type Props = {
  /** Force-show when parent knows we're offline. */
  offline?: boolean;
  /** Error text — shown when it looks like a network failure. */
  error?: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  /** Full-screen offline mockup (customer-26). */
  fullScreen?: boolean;
};

export function isNetworkError(err: unknown): boolean {
  const m = err instanceof Error ? err.message : String(err || "");
  return /network|offline|failed to fetch|network request failed|timed out|timeout/i.test(m);
}

/**
 * Dismissible offline banner, or full-screen when `fullScreen`.
 */
export function OfflineBanner({ offline, error, onRetry, onDismiss, fullScreen }: Props) {
  const [hidden, setHidden] = useState(false);
  const networkish = offline || (error ? isNetworkError(error) : false);
  if (!networkish || hidden) return null;

  if (fullScreen) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <OfflineScreen
          onRetry={() => {
            setHidden(false);
            onRetry?.();
          }}
          reconnecting
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>You're offline</Text>
          <Text style={styles.sub}>
            {error && isNetworkError(error) ? error : "Check your connection. Your cart is saved locally."}
          </Text>
        </View>
        {onRetry ? (
          <Pressable
            style={styles.retry}
            onPress={() => {
              setHidden(false);
              onRetry();
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        ) : null}
        <Pressable
          hitSlop={8}
          onPress={() => {
            setHidden(true);
            onDismiss?.();
          }}
        >
          <Text style={styles.dismiss}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.chocolate,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    marginBottom: space.sm,
  },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  title: { fontFamily: fonts.bold, color: colors.white, fontSize: 13 },
  sub: { fontFamily: fonts.body, color: "rgba(255,249,245,0.85)", fontSize: 12, marginTop: 2 },
  retry: {
    backgroundColor: colors.pink,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryText: { fontFamily: fonts.bold, color: colors.white, fontSize: 12 },
  dismiss: { fontFamily: fonts.bold, color: colors.cream, fontSize: 16, paddingHorizontal: 4 },
});

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";

import { FadeIn } from "@/components/FadeIn";
import { BrandHeader } from "@/components/ui/BrandHeader";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { useTabBarClearance } from "@/hooks/use-tab-bar-clearance";
import { useThemeColors } from "@/context/theme";
import { useI18n } from "@/lib/i18n";
import { connectChatSocket, emitTyping, getSocket, joinChatRoom } from "@/lib/socket";
import { fonts, radius } from "@/lib/theme";

type Conv = {
  id: number;
  admin_online?: boolean;
  is_ai?: boolean;
  last_message?: string;
  unread_customer?: number;
};

type Msg = {
  id: number;
  sender_role?: string;
  content?: string | null;
  message_type?: string;
  media_url?: string | null;
  is_delivered?: boolean;
  is_read?: boolean;
  created_at?: string;
  conversation_id?: number;
};

export default function ChatScreen() {
  const c = useThemeColors();
  const clearance = useTabBarClearance(12);
  const { lang } = useI18n();
  const [conv, setConv] = useState<Conv | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [useAi, setUseAi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [handover, setHandover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quick, setQuick] = useState<string[]>([]);
  const [attachOpen, setAttachOpen] = useState(false);
  const listRef = useRef<FlatList>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const convIdRef = useRef<number | null>(null);
  convIdRef.current = conv?.id ?? null;

  const loadMessages = useCallback(async (id: number) => {
    const data = await api.customer.chatMessages(id);
    setMessages(Array.isArray(data) ? (data as Msg[]) : []);
  }, []);

  const mergeMsg = useCallback((incoming: Msg) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === incoming.id)) return prev;
      return [...prev, incoming];
    });
  }, []);

  const openThread = useCallback(
    async (ai: boolean, fromAi = false) => {
      setBusy(true);
      setError(null);
      if (!ai && fromAi) setHandover(true);
      setUseAi(ai);
      try {
        const list = await api.customer.chats();
        const rows = Array.isArray(list) ? (list as Conv[]) : [];
        let row = rows.find((r) => Boolean(r.is_ai) === ai) || rows[0];
        if (!row?.id) {
          row = (await api.customer.createChat({
            category: ai ? "ai" : "general",
            is_ai: ai,
          })) as Conv;
        }
        setConv(row);
        if (row.id) {
          await loadMessages(row.id);
          joinChatRoom(row.id);
        }
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Could not open chat");
      } finally {
        setBusy(false);
        if (!ai) setHandover(false);
      }
    },
    [loadMessages]
  );

  const goBakery = useCallback(() => openThread(false, true), [openThread]);

  useEffect(() => {
    openThread(false);
  }, [openThread]);

  useEffect(() => {
    api.customer
      .faqs()
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        const qs = list
          .map((r: { question?: string }) => r.question)
          .filter((q): q is string => Boolean(q && String(q).trim()))
          .slice(0, 6);
        setQuick(qs);
      })
      .catch(() => setQuick([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await connectChatSocket();
      if (!s || cancelled) return;
      setLive(s.connected);
      const onConnect = () => {
        setLive(true);
        if (convIdRef.current) joinChatRoom(convIdRef.current);
      };
      const onDisconnect = () => setLive(false);
      const onMsg = (payload: Msg) => {
        if (!payload?.id || !convIdRef.current) return;
        if (payload.conversation_id === convIdRef.current) mergeMsg(payload);
      };
      const onTyping = (p: { conversation_id?: number; is_typing?: boolean }) => {
        if (p.conversation_id === convIdRef.current) setPeerTyping(Boolean(p.is_typing));
      };
      const onPresence = (p: { is_online?: boolean }) => {
        setConv((prev) => (prev ? { ...prev, admin_online: Boolean(p.is_online) } : prev));
      };
      s.on("connect", onConnect);
      s.on("disconnect", onDisconnect);
      s.on("chat_message", onMsg);
      s.on("typing", onTyping);
      s.on("user_presence", onPresence);
      if (convIdRef.current) joinChatRoom(convIdRef.current);
    })();
    return () => {
      cancelled = true;
      const s = getSocket();
      s?.off("connect");
      s?.off("disconnect");
      s?.off("chat_message");
      s?.off("typing");
      s?.off("user_presence");
    };
  }, [mergeMsg]);

  useEffect(() => {
    if (!conv?.id) return;
    const ms = live ? 12000 : 2500;
    const t = setInterval(async () => {
      try {
        await loadMessages(conv.id);
      } catch {
        /* ignore */
      }
    }, ms);
    return () => clearInterval(t);
  }, [conv?.id, live, loadMessages]);

  function onDraft(text: string) {
    setDraft(text);
    if (!conv?.id || useAi) return;
    emitTyping(conv.id, true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(conv.id!, false), 1200);
  }

  async function sendText(textIn?: string) {
    const text = (textIn ?? draft).trim();
    if (!text || !conv?.id) return;
    if (useAi && text.toLowerCase().includes("talk to bakery")) {
      setDraft("");
      await goBakery();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (useAi) {
        const res = await api.customer.aiChat(text, conv.id, lang);
        if (res.handed_over) await goBakery();
      } else {
        await api.customer.sendChatMessage(conv.id, { content: text, message_type: "text" });
        emitTyping(conv.id, false);
      }
      setDraft("");
      await loadMessages(conv.id);
      listRef.current?.scrollToEnd({ animated: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  async function pickAndSend(fromCamera: boolean) {
    if (!conv?.id) return;
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      setError(fromCamera ? "Camera permission needed" : "Photo permission needed");
      return;
    }
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.55 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.55 });
    if (res.canceled || !res.assets[0]?.uri) return;
    setBusy(true);
    setError(null);
    try {
      if (useAi) await goBakery();
      const up = await api.uploads.file(res.assets[0].uri, "chat", "chat.jpg");
      await api.customer.sendChatMessage(conv.id, {
        content: "📷 Photo",
        message_type: "image",
        media_url: up.url,
      });
      setUseAi(false);
      await loadMessages(conv.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Photo send failed");
    } finally {
      setBusy(false);
    }
  }

  async function callBakery() {
    setBusy(true);
    setError(null);
    try {
      const call = (await api.customer.startCall({
        target: "bakery",
        call_type: "phone",
      })) as { id?: number; masked_number?: string | null };
      const phone = String(call.masked_number || "").replace(/[^\d+]/g, "");
      if (phone) {
        await Linking.openURL(`tel:${phone}`);
      } else {
        setError("Dialer number unavailable — try Call history.");
      }
      if (conv?.id) await loadMessages(conv.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Call request failed");
    } finally {
      setBusy(false);
    }
  }

  function renderMsg({ item }: { item: Msg }) {
    const mine = item.sender_role === "customer";
    const bot = item.sender_role === "ai" || item.sender_role === "system";
    return (
      <View
        style={[
          styles.bubble,
          mine
            ? { alignSelf: "flex-end", backgroundColor: c.pink, borderBottomRightRadius: 6 }
            : bot
              ? { alignSelf: "flex-start", backgroundColor: c.blushSoft, borderBottomLeftRadius: 6 }
              : {
                  alignSelf: "flex-start",
                  backgroundColor: c.paper,
                  borderWidth: 1,
                  borderColor: c.border,
                  borderBottomLeftRadius: 6,
                },
        ]}
      >
        {!mine ? (
          <Text style={[styles.role, { color: c.muted }]}>
            {item.sender_role === "admin" ? "Bakery" : item.sender_role || "bakery"}
          </Text>
        ) : null}
        {item.message_type === "image" && item.media_url ? (
          <Image source={{ uri: item.media_url }} style={styles.photo} />
        ) : null}
        {item.content ? (
          <Text style={[styles.body, { color: mine ? c.white : c.ink }]}>{item.content}</Text>
        ) : null}
        {mine ? (
          <Text style={[styles.tick, { color: "rgba(255,255,255,0.75)" }]}>
            {item.is_read ? "Read" : item.is_delivered ? "Delivered" : "Sent"}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <Screen pad={false} edges={[]}>
      <BrandHeader left="none" right="none" />
      <LinearGradient colors={["#E4EEF7", c.cream, "#F7EEF2", c.creamDeep]} style={styles.bg} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={8}
      >
        <FadeIn>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: c.ink }]}>Chat</Text>
              <Text style={[styles.sub, { color: c.muted }]}>
                {live ? "Live" : "Connecting…"}
                {" · "}
                {conv?.admin_online ? "Bakery online" : "Messages wait for bakery"}
              </Text>
            </View>
            <View
              style={[
                styles.dot,
                { borderColor: c.paper },
                conv?.admin_online ? { backgroundColor: c.success } : { backgroundColor: c.muted },
              ]}
            />
          </View>

          <View style={[styles.modeRow, { backgroundColor: c.paper, borderColor: c.border }]}>
            <Pressable
              style={[styles.mode, !useAi && { backgroundColor: c.chocolate }]}
              onPress={() => (useAi ? goBakery() : undefined)}
            >
              <Text style={[styles.modeText, { color: c.muted }, !useAi && { color: c.white }]}>Bakery</Text>
            </Pressable>
            <Pressable style={[styles.mode, useAi && { backgroundColor: c.pink }]} onPress={() => openThread(true)}>
              <Text style={[styles.modeText, { color: c.muted }, useAi && { color: c.white }]}>AI Assistant</Text>
            </Pressable>
          </View>

          {handover ? (
            <View style={[styles.handover, { backgroundColor: c.blushSoft, borderColor: c.pink }]}>
              <ActivityIndicator size="small" color={c.pink} />
              <Text style={[styles.handoverText, { color: c.chocolate }]}>
                Connecting you to SweetCrust bakery owner…
              </Text>
            </View>
          ) : null}

          {quick.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickRow}
              style={styles.quickScroll}
            >
              {quick.map((q) => (
                <Pressable
                  key={q}
                  style={[styles.quick, { backgroundColor: c.blushSoft, borderColor: "rgba(233,116,142,0.25)" }]}
                  onPress={() => sendText(q)}
                  disabled={busy}
                >
                  <Text style={[styles.quickText, { color: c.ink }]} numberOfLines={1}>
                    {q}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          {error ? <Text style={[styles.error, { color: c.danger }]}>{error}</Text> : null}
          {peerTyping ? <Text style={[styles.typing, { color: c.pink }]}>Bakery is typing…</Text> : null}
        </FadeIn>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          renderItem={renderMsg}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: c.muted }]}>
              {useAi
                ? "Ask about cakes, delivery, returns, or custom orders."
                : "Message the bakery. Tap + for call, photo, or camera."}
            </Text>
          }
        />

        <View style={[styles.composerWrap, { paddingBottom: clearance, backgroundColor: "#FFFFFF", borderTopColor: c.border }]}>
          {attachOpen ? (
            <View style={styles.attachMenu}>
              {!useAi ? (
                <Pressable
                  style={[styles.attachItem, { backgroundColor: c.blushSoft }]}
                  onPress={() => {
                    setAttachOpen(false);
                    void callBakery();
                  }}
                  disabled={busy}
                >
                  <View style={[styles.attachIcon, { backgroundColor: c.pink }]}>
                    <Icon name="call-outline" size={16} color="#FFF" />
                  </View>
                  <Text style={[styles.attachLabel, { color: c.ink }]}>Call</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={[styles.attachItem, { backgroundColor: c.cream }]}
                onPress={() => {
                  setAttachOpen(false);
                  void pickAndSend(false);
                }}
                disabled={busy || !conv?.id}
              >
                <View style={[styles.attachIcon, { backgroundColor: c.chocolate }]}>
                  <Icon name="image-outline" size={16} color="#FFF" />
                </View>
                <Text style={[styles.attachLabel, { color: c.ink }]}>Photo</Text>
              </Pressable>
              <Pressable
                style={[styles.attachItem, { backgroundColor: c.cream }]}
                onPress={() => {
                  setAttachOpen(false);
                  void pickAndSend(true);
                }}
                disabled={busy || !conv?.id}
              >
                <View style={[styles.attachIcon, { backgroundColor: c.pink }]}>
                  <Icon name="camera-outline" size={16} color="#FFF" />
                </View>
                <Text style={[styles.attachLabel, { color: c.ink }]}>Camera</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={[styles.composer, { backgroundColor: c.cream, borderColor: c.border }]}>
            <Pressable
              style={[styles.attachBtn, { backgroundColor: attachOpen ? c.pink : c.paper, borderColor: c.border }]}
              onPress={() => setAttachOpen((v) => !v)}
              accessibilityLabel={attachOpen ? "Close attach menu" : "Open attach menu"}
            >
              <Icon name={attachOpen ? "close" : "add"} size={22} color={attachOpen ? "#FFF" : c.pink} />
            </Pressable>
            <TextInput
              style={[styles.input, { color: c.ink }]}
              value={draft}
              onChangeText={(t) => {
                if (attachOpen) setAttachOpen(false);
                onDraft(t);
              }}
              placeholder={useAi ? "Ask AI…" : "Message bakery…"}
              placeholderTextColor={c.muted}
              editable={!busy}
              multiline
            />
            <Pressable
              style={[styles.send, { backgroundColor: c.pink, opacity: busy || !draft.trim() ? 0.45 : 1 }]}
              onPress={() => sendText()}
              disabled={busy || !draft.trim()}
            >
              {busy ? <ActivityIndicator color="#FFF" /> : <Icon name="send" size={18} color="#FFF" />}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  bg: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: -1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  title: { fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.6 },
  sub: { marginTop: 4, fontSize: 12, fontFamily: fonts.body, maxWidth: 300 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  modeRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 1,
  },
  mode: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: "center" },
  modeText: { fontFamily: fonts.bold, fontSize: 13 },
  handover: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  handoverText: { flex: 1, fontFamily: fonts.medium, fontSize: 13 },
  quickScroll: { maxHeight: 42, flexGrow: 0, marginTop: 10, marginBottom: 4 },
  quickRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  quick: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  quickText: { fontSize: 12, fontFamily: fonts.medium },
  error: { paddingHorizontal: 16, marginBottom: 4, fontSize: 13, fontFamily: fonts.medium },
  typing: { paddingHorizontal: 16, fontSize: 12, fontFamily: fonts.bold, marginBottom: 2 },
  list: { paddingHorizontal: 16, paddingBottom: 12, flexGrow: 1 },
  empty: {
    marginTop: 40,
    textAlign: "center",
    paddingHorizontal: 24,
    fontFamily: fonts.body,
  },
  bubble: {
    maxWidth: "88%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginVertical: 4,
  },
  role: {
    fontSize: 10,
    fontFamily: fonts.bold,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  body: { fontSize: 15, lineHeight: 21, fontFamily: fonts.body },
  tick: { marginTop: 4, fontSize: 10, alignSelf: "flex-end", fontFamily: fonts.medium },
  photo: { width: 200, height: 160, borderRadius: 12, marginBottom: 4 },
  composerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  attachMenu: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  attachItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 16,
  },
  attachIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4A6280",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  attachLabel: { fontFamily: fonts.bold, fontSize: 12 },
  composer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
    padding: 8,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "flex-end",
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E9748E",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  input: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontFamily: fonts.body,
    maxHeight: 100,
  },
  send: {
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#E9748E",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
});

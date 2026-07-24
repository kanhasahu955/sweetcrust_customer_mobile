import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { FadeIn } from "@/components/FadeIn";
import { BrandHeader, TitleFlourish } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Screen } from "@/components/ui/Screen";
import { useApp } from "@/context/app";
import { useThemeColors } from "@/context/theme";
import { api, normalizePhone, updateStoredUser } from "@/lib/api";
import { fonts, radius, space } from "@/lib/theme";

WebBrowser.maybeCompleteAuthSession();

type Step = "phone" | "otp" | "name";

export default function LoginScreen() {
  const c = useThemeColors();
  const { afterLogin, busy: appBusy, error: appError, setError: setAppError } = useApp();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const afterTokens = useCallback(
    async (tokens: Awaited<ReturnType<typeof api.auth.verifyOtp>>, opts?: { skipName?: boolean }) => {
      await afterLogin(tokens);
      const userName = tokens.user?.name?.trim() || "";
      if (opts?.skipName || (tokens.user as { is_guest?: boolean } | undefined)?.is_guest) {
        router.replace("/(tabs)/home");
        return;
      }
      if (!userName || userName === "Guest User") {
        setStep("name");
      } else {
        router.replace("/(tabs)/home");
      }
    },
    [afterLogin]
  );

  async function continueAsGuest() {
    setBusy(true);
    setError(null);
    try {
      const tokens = await api.auth.guest();
      await afterTokens(tokens, { skipName: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Guest login failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp() {
    try {
      if (typeof normalizePhone !== "function" || typeof api?.auth?.sendOtp !== "function") {
        setError("App update required — reload Expo (shake → Reload).");
        return;
      }
      const normalized = normalizePhone(String(phone || ""));
      if (normalized.replace(/\D/g, "").length < 10) {
        setError("Enter a valid 10-digit mobile number");
        return;
      }
      setBusy(true);
      setError(null);
      if (typeof setAppError === "function") setAppError(null);
      setHint(null);
      const res = await api.auth.sendOtp(normalized, "login");
      setPhone(normalized);
      setStep("otp");
      if (res?.dev_otp) {
        setHint(`Dev OTP: ${res.dev_otp}`);
        setCode(String(res.dev_otp));
      } else {
        setHint("OTP sent. Enter the code to sign in.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send OTP");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    try {
      if (code.trim().length < 4) {
        setError("Enter the OTP");
        return;
      }
      if (typeof api?.auth?.verifyOtp !== "function" || typeof afterLogin !== "function") {
        setError("App update required — reload Expo (shake → Reload).");
        return;
      }
      setBusy(true);
      setError(null);
      const tokens = await api.auth.verifyOtp(normalizePhone(String(phone || "")), code.trim(), {
        terms_accepted: true,
        ...(name.trim() ? { name: name.trim() } : {}),
      });
      await afterTokens(tokens);
    } catch (e) {
      setError(e instanceof Error ? e.message : "OTP verification failed");
    } finally {
      setBusy(false);
    }
  }

  const onGoogleBrowser = useCallback(async () => {
    setGoogleBusy(true);
    setError(null);
    setHint(null);
    try {
      const appRedirect = Linking.createURL("google-auth");
      const startUrl =
        `${api.baseUrl}/api/v1/auth/google/start` +
        `?app_redirect=${encodeURIComponent(appRedirect)}`;
      const result = await WebBrowser.openAuthSessionAsync(startUrl, appRedirect);
      if (result.type !== "success" || !result.url) {
        if (result.type !== "dismiss" && result.type !== "cancel") {
          setError("Google sign-in was cancelled");
        }
        return;
      }
      const parsed = Linking.parse(result.url);
      const err = typeof parsed.queryParams?.error === "string" ? parsed.queryParams.error : null;
      if (err) {
        setError(`Google error: ${err}`);
        return;
      }
      const finishCode = typeof parsed.queryParams?.code === "string" ? parsed.queryParams.code : null;
      if (!finishCode) {
        setError("No login code returned from Google.");
        return;
      }
      const tokens = await api.auth.googleFinish(finishCode);
      await afterTokens(tokens);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in failed");
    } finally {
      setGoogleBusy(false);
    }
  }, [afterTokens]);

  async function saveName() {
    if (name.trim().length < 2) {
      setError("Please tell us your name");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const user = (await api.auth.updateMe({ name: name.trim() })) as {
        id: number;
        phone: string;
        name?: string | null;
        role: string;
      };
      await updateStoredUser(user);
      router.replace("/(tabs)/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save name");
    } finally {
      setBusy(false);
    }
  }

  const locked = busy || appBusy || googleBusy;
  const showError = error || appError;

  return (
    <Screen edges={["top", "left", "right"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <FadeIn delay={40} style={styles.brandBlock}>
          <BrandHeader left="none" right="none" hero climate={false} />
          <TitleFlourish title="Welcome to Sweet Crust" subtitle="Enter your mobile number to continue." />
        </FadeIn>

        <FadeIn delay={120} style={[styles.panel, { backgroundColor: c.paper, borderColor: c.border }]}>
          {step === "phone" ? (
            <>
              <View style={[styles.phoneRow, { borderColor: c.inputBorder, backgroundColor: c.cream }]}>
                <View style={[styles.cc, { borderRightColor: c.border }]}>
                  <Text style={[styles.ccText, { color: c.ink }]}>+91 ▾</Text>
                </View>
                <TextInput
                  style={[styles.phoneInput, { color: c.ink }]}
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t);
                    setError(null);
                  }}
                  placeholder="98765 43210"
                  placeholderTextColor={c.muted}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  maxLength={16}
                />
              </View>
              <FloatPress style={[styles.btn, { backgroundColor: c.chocolate }, locked && styles.disabled]} onPress={sendOtp} disabled={locked}>
                {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Send OTP  ✈</Text>}
              </FloatPress>
              <FloatPress
                style={[styles.btnGhost, { backgroundColor: c.paper, borderColor: c.chocolate }, locked && styles.disabled]}
                onPress={continueAsGuest}
                disabled={locked}
              >
                <Text style={[styles.btnGhostText, { color: c.chocolate }]}>Continue as Guest</Text>
              </FloatPress>
              <Text style={[styles.or, { color: c.muted }]}>or</Text>
              <FloatPress
                style={[styles.btnSecondary, { backgroundColor: c.blushSoft, borderColor: c.blush }, locked && styles.disabled]}
                onPress={onGoogleBrowser}
                disabled={locked}
              >
                {googleBusy ? (
                  <ActivityIndicator color={c.ink} />
                ) : (
                  <Text style={[styles.btnSecondaryText, { color: c.ink }]}>Continue with Google</Text>
                )}
              </FloatPress>
              <Text style={[styles.terms, { color: c.muted }]}>I accept Terms & Privacy Policy</Text>
            </>
          ) : null}

          {step === "otp" ? (
            <>
              <Text style={[styles.title, { color: c.ink }]}>Enter OTP</Text>
              <Text style={[styles.hint, { color: c.muted }]}>Sent to {phone}</Text>
              {hint ? <Text style={[styles.devHint, { color: c.coral }]}>{hint}</Text> : null}
              <TextInput
                style={[styles.input, { borderColor: c.inputBorder, backgroundColor: c.cream, color: c.ink }]}
                value={code}
                onChangeText={setCode}
                placeholder="6-digit code"
                placeholderTextColor={c.muted}
                keyboardType="number-pad"
                maxLength={8}
              />
              <FloatPress style={[styles.btn, { backgroundColor: c.chocolate }, locked && styles.disabled]} onPress={verifyOtp} disabled={locked}>
                {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Verify & continue</Text>}
              </FloatPress>
              <FloatPress onPress={sendOtp} disabled={locked}>
                <Text style={[styles.link, { color: c.pink }]}>{busy ? "Sending…" : "Resend OTP"}</Text>
              </FloatPress>
              <FloatPress
                onPress={() => {
                  setStep("phone");
                  setCode("");
                  setHint(null);
                }}
                disabled={locked}
              >
                <Text style={[styles.link, { color: c.pink }]}>Change number</Text>
              </FloatPress>
            </>
          ) : null}

          {step === "name" ? (
            <>
              <Text style={[styles.title, { color: c.ink }]}>What should we call you?</Text>
              <Text style={[styles.hint, { color: c.muted }]}>One quick detail so orders feel personal.</Text>
              <TextInput
                style={[styles.input, { borderColor: c.inputBorder, backgroundColor: c.cream, color: c.ink }]}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={c.muted}
                autoCapitalize="words"
              />
              <FloatPress style={[styles.btn, { backgroundColor: c.chocolate }, locked && styles.disabled]} onPress={saveName} disabled={locked}>
                {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Continue</Text>}
              </FloatPress>
            </>
          ) : null}

          {hint && step === "phone" ? <Text style={[styles.devHint, { color: c.coral }]}>{hint}</Text> : null}
          {showError ? <Text style={[styles.error, { color: c.danger }]}>{showError}</Text> : null}
        </FadeIn>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: "center", gap: space.md },
  brandBlock: { alignItems: "center", gap: 4, marginBottom: space.sm },
  panel: {
    borderRadius: radius.xl,
    padding: space.lg,
    borderWidth: 1,
    gap: space.md,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  cc: { paddingHorizontal: 12, paddingVertical: 14, borderRightWidth: 1 },
  ccText: { fontFamily: fonts.bold },
  phoneInput: {
    flex: 1,
    paddingHorizontal: space.md,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: fonts.body,
  },
  title: { fontFamily: fonts.display, fontSize: 26 },
  hint: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  devHint: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: fonts.body,
  },
  btn: {
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnGhost: {
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1.5,
  },
  btnGhostText: { fontFamily: fonts.bold, fontSize: 16 },
  btnSecondary: {
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  btnSecondaryText: { fontFamily: fonts.bold, fontSize: 16 },
  disabled: { opacity: 0.7 },
  btnText: { color: "#FFF", fontFamily: fonts.bold, fontSize: 16 },
  or: { textAlign: "center", fontFamily: fonts.medium },
  terms: { textAlign: "center", fontFamily: fonts.body, fontSize: 12 },
  link: { textAlign: "center", fontFamily: fonts.bold, marginTop: 4 },
  error: { fontFamily: fonts.medium, fontSize: 14 },
});

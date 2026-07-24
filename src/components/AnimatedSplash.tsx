import { useEffect, useRef } from "react";
import { Image, StyleSheet, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

const APP_LOGO = require("../../assets/images/sweetcrust-logo.png");

type Props = {
  tagline?: string;
  onDone: () => void;
};

/** Short branded splash — full SweetCrust mark. */
export function AnimatedSplash({ onDone }: Props) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const { width } = useWindowDimensions();
  const logoSize = Math.min(width * 0.72, 300);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.96);
  const exit = useSharedValue(1);

  useEffect(() => {
    const finish = () => onDoneRef.current();
    opacity.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) });
    scale.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });
    exit.value = withDelay(
      1600,
      withTiming(0, { duration: 320, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(finish)();
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootStyle = useAnimatedStyle(() => ({ opacity: exit.value }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.root, rootStyle]}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#2A1712", "#1A100C", "#0E0907"]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.stage}>
        <Animated.View style={[styles.mark, markStyle]}>
          <Image
            source={APP_LOGO}
            style={{ width: logoSize, height: logoSize }}
            resizeMode="contain"
            accessibilityLabel="SweetCrust Bakery"
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0E0907",
  },
  stage: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  mark: {
    alignItems: "center",
    justifyContent: "center",
  },
});

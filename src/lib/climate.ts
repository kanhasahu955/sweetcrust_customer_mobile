/**
 * Season + time-of-day + live weather mood for atmosphere overlays.
 * Weather via Open-Meteo (no API key). Season always drives a visible effect.
 */

export type Season = "winter" | "summer" | "monsoon" | "autumn";
export type WeatherKind = "clear" | "cloudy" | "fog" | "rain" | "storm" | "snow";
export type DayPart = "morning" | "afternoon" | "evening" | "night";
export type OverlayKind =
  | "clouds"
  | "rain"
  | "snow"
  | "mist"
  | "stars"
  | "leaves"
  | "heat"
  | "sun"
  | "moon";

export type ClimateMood = {
  season: Season;
  weather: WeatherKind;
  dayPart: DayPart;
  label: string;
  tempC: number | null;
  sky: [string, string, string];
  fog: string;
  accent: string;
  veil: string;
  overlays: OverlayKind[];
  /** 0–1 strength for floating particles / clouds */
  overlayOpacity: number;
};

export function calendarSeason(d = new Date()): Season {
  const m = d.getMonth();
  if (m <= 1 || m === 11) return "winter";
  if (m >= 2 && m <= 4) return "summer";
  if (m >= 5 && m <= 8) return "monsoon";
  return "autumn";
}

export function dayPartFromHour(h = new Date().getHours()): DayPart {
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 16) return "afternoon";
  if (h >= 16 && h < 20) return "evening";
  return "night";
}

export function weatherFromCode(code: number): WeatherKind {
  if (code === 45 || code === 48) return "fog";
  if (code >= 95) return "storm";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (code === 2 || code === 3) return "cloudy";
  return "clear";
}

const DAY_PART_META: Record<DayPart, { veil: string; label: string; skyTint: [string, string, string] }> = {
  morning: {
    veil: "rgba(180, 210, 235, 0.12)",
    label: "Morning",
    skyTint: ["#E4EEF7", "#F2F4F7", "#F7F0F2"],
  },
  afternoon: {
    veil: "rgba(200, 220, 235, 0.08)",
    label: "Afternoon",
    skyTint: ["#EAF2F8", "#F4F1EE", "#F3F6FA"],
  },
  evening: {
    veil: "rgba(233, 116, 142, 0.1)",
    label: "Evening",
    skyTint: ["#E8DCE8", "#F0E8EC", "#F3F0F4"],
  },
  night: {
    veil: "rgba(30, 40, 70, 0.18)",
    label: "Night",
    skyTint: ["#D8DEEA", "#E4E8F0", "#ECEEF4"],
  },
};

const SEASON_SKY: Record<Season, [string, string, string]> = {
  winter: ["#E8EEF6", "#F0F2F6", "#F3F6FA"],
  summer: ["#EAF2F8", "#F4F1EE", "#F7F0F2"],
  monsoon: ["#E2EAF2", "#EAF0F5", "#F3F6FA"],
  autumn: ["#ECE8F0", "#F4F0F2", "#F3F6FA"],
};

const SEASON_META: Record<Season, { fog: string; accent: string; label: string }> = {
  winter: { fog: "rgba(180, 190, 210, 0.28)", accent: "#6B7C9C", label: "Winter" },
  summer: { fog: "rgba(255, 200, 140, 0.18)", accent: "#E07A48", label: "Summer" },
  monsoon: { fog: "rgba(120, 145, 165, 0.26)", accent: "#4A7C8C", label: "Monsoon" },
  autumn: { fog: "rgba(200, 140, 100, 0.18)", accent: "#C47A2A", label: "Festive" },
};

function compose(
  season: Season,
  weather: WeatherKind,
  tempC: number | null,
  dayPart: DayPart = dayPartFromHour(),
): ClimateMood {
  const seasonMeta = SEASON_META[season];
  const day = DAY_PART_META[dayPart];
  let sky: [string, string, string] = [day.skyTint[0], day.skyTint[1], SEASON_SKY[season][2]];
  let fog = seasonMeta.fog;
  let accent = seasonMeta.accent;
  let veil = day.veil;
  let overlayOpacity = 0.45;
  const overlays = new Set<OverlayKind>();

  // Time-of-day sky body (header sun / moon)
  if (dayPart === "night") {
    overlays.add("moon");
    overlays.add("stars");
  } else {
    overlays.add("sun");
  }

  // Season accents in the header band
  if (season === "monsoon") {
    overlays.add("clouds");
    overlays.add("mist");
    overlays.add("rain");
    overlayOpacity = 0.5;
    veil = "rgba(70, 100, 120, 0.08)";
  } else if (season === "winter") {
    overlays.add("mist");
    overlays.add("clouds");
    overlayOpacity = 0.42;
  } else if (season === "summer") {
    overlayOpacity = 0.35;
  } else {
    overlays.add("mist");
    overlayOpacity = 0.4;
  }

  // Live weather intensifies / replaces season defaults
  if (weather === "rain" || weather === "storm") {
    sky = ["#E4EAF0", "#D0DCE6", "#E8E4E0"];
    fog = "rgba(90, 120, 140, 0.3)";
    accent = weather === "storm" ? "#3D5A6C" : "#5A8A9A";
    veil = "rgba(70, 100, 120, 0.12)";
    overlayOpacity = weather === "storm" ? 0.65 : 0.55;
    overlays.add("clouds");
    overlays.add("rain");
    overlays.add("mist");
    overlays.delete("heat");
    overlays.delete("leaves");
  } else if (weather === "snow") {
    sky = ["#F0F4FA", "#E4EAF4", "#F8F6F4"];
    fog = "rgba(200, 215, 230, 0.32)";
    accent = "#7A8FA8";
    veil = "rgba(200, 220, 240, 0.12)";
    overlayOpacity = 0.55;
    overlays.clear();
    overlays.add("clouds");
    overlays.add("snow");
    overlays.add("mist");
  } else if (weather === "fog") {
    fog = "rgba(160, 160, 170, 0.35)";
    veil = "rgba(150, 155, 165, 0.14)";
    overlayOpacity = 0.5;
    overlays.add("mist");
    overlays.add("clouds");
  } else if (weather === "cloudy") {
    sky = [sky[0], "#E6E8EC", sky[2]];
    fog = "rgba(170, 180, 195, 0.28)";
    veil = "rgba(140, 150, 165, 0.1)";
    overlayOpacity = 0.52;
    overlays.add("clouds");
    overlays.add("mist");
    // cloudy day: no forced rain unless monsoon season already added it
    if (season !== "monsoon") overlays.delete("rain");
  } else if (weather === "clear") {
    if (season === "summer") {
      overlays.delete("rain");
      overlays.delete("clouds");
      overlays.add("heat");
      if (tempC != null && tempC >= 35) overlayOpacity = 0.4;
    }
    if (season === "winter") {
      overlays.delete("rain");
    }
  }

  if (dayPart === "night") {
    veil = "rgba(25, 35, 65, 0.12)";
    overlays.delete("sun");
    overlays.add("moon");
    overlays.add("stars");
    if (weather === "clear" && season !== "monsoon") {
      overlays.delete("rain");
    }
  }

  const weatherLabel =
    weather === "rain"
      ? "Rainy"
      : weather === "storm"
        ? "Stormy"
        : weather === "snow"
          ? "Snowy"
          : weather === "fog"
            ? "Foggy"
            : weather === "cloudy"
              ? "Cloudy"
              : seasonMeta.label;

  return {
    season,
    weather,
    dayPart,
    label: `${day.label} · ${weatherLabel}`,
    tempC,
    sky,
    fog,
    accent,
    veil,
    overlays: [...overlays],
    overlayOpacity,
  };
}

export function climateSelfCheck() {
  const assert = (ok: boolean, msg: string) => {
    if (!ok) throw new Error(`climate: ${msg}`);
  };
  assert(calendarSeason(new Date("2026-07-15")) === "monsoon", "jul=monsoon");
  assert(dayPartFromHour(7) === "morning", "7=morning");
  assert(weatherFromCode(3) === "cloudy", "3=cloudy");
  const monsoonClear = compose("monsoon", "clear", 19, "morning");
  assert(monsoonClear.overlays.includes("rain"), "monsoon clear still rains");
  assert(monsoonClear.overlays.includes("sun"), "morning sun");
  assert(compose("summer", "clear", 30, "evening").overlays.includes("sun"), "evening sun");
  assert(compose("winter", "clear", 10, "night").overlays.includes("moon"), "night moon");
  return true;
}

if (typeof __DEV__ !== "undefined" && __DEV__) {
  try {
    climateSelfCheck();
  } catch (e) {
    console.warn(e);
  }
}

export function climateFallback(): ClimateMood {
  return compose(calendarSeason(), "clear", null, dayPartFromHour());
}

export async function loadClimate(lat?: number | null, lng?: number | null): Promise<ClimateMood> {
  const season = calendarSeason();
  const dayPart = dayPartFromHour();
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return compose(season, "clear", null, dayPart);
  }
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,weather_code&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return compose(season, "clear", null, dayPart);
    const data = (await res.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
    };
    const code = Number(data.current?.weather_code ?? 0);
    const temp = data.current?.temperature_2m != null ? Number(data.current.temperature_2m) : null;
    return compose(season, weatherFromCode(code), temp, dayPart);
  } catch {
    return compose(season, "clear", null, dayPart);
  }
}

import { describe, expect, it } from "vitest";
import {
  decodeBoolean,
  decodeCubeSize,
  decodeVolume,
  readSetting,
  writeSetting,
  type SettingsStorage,
} from "./settings";

function fakeStorage(initial: Record<string, string> = {}): SettingsStorage & {
  entries: Map<string, string>;
} {
  const entries = new Map(Object.entries(initial));
  return {
    entries,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
  };
}

/** Stands in for private mode / blocked site data, where both calls throw. */
const throwingStorage: SettingsStorage = {
  getItem() {
    throw new Error("blocked");
  },
  setItem() {
    throw new Error("blocked");
  },
};

describe("decodeBoolean", () => {
  it("accepts the two values it writes", () => {
    expect(decodeBoolean("true")).toBe(true);
    expect(decodeBoolean("false")).toBe(false);
  });

  it("rejects anything else", () => {
    expect(decodeBoolean("")).toBeUndefined();
    expect(decodeBoolean("1")).toBeUndefined();
    expect(decodeBoolean("TRUE")).toBeUndefined();
  });
});

describe("decodeCubeSize", () => {
  it("accepts the supported sizes", () => {
    expect(decodeCubeSize("2")).toBe(2);
    expect(decodeCubeSize("7")).toBe(7);
  });

  it("rejects sizes the scrambler has no config for", () => {
    expect(decodeCubeSize("1")).toBeUndefined();
    expect(decodeCubeSize("8")).toBeUndefined();
    expect(decodeCubeSize("3.5")).toBeUndefined();
    expect(decodeCubeSize("three")).toBeUndefined();
  });
});

describe("decodeVolume", () => {
  it("accepts whole percentages across the range", () => {
    expect(decodeVolume("0")).toBe(0);
    expect(decodeVolume("55")).toBe(55);
    expect(decodeVolume("100")).toBe(100);
  });

  it("rejects values outside 0-100", () => {
    expect(decodeVolume("-1")).toBeUndefined();
    expect(decodeVolume("101")).toBeUndefined();
  });

  it("rejects anything that isn't a whole number", () => {
    expect(decodeVolume("")).toBeUndefined();
    expect(decodeVolume(" 70")).toBeUndefined();
    expect(decodeVolume("0.7")).toBeUndefined();
    expect(decodeVolume("loud")).toBeUndefined();
    expect(decodeVolume("NaN")).toBeUndefined();
    expect(decodeVolume("Infinity")).toBeUndefined();
  });
});

describe("readSetting", () => {
  it("decodes a stored value", () => {
    const storage = fakeStorage({ "cozycubes:inspection-enabled": "true" });
    expect(readSetting(storage, "cozycubes:inspection-enabled", decodeBoolean)).toBe(true);
  });

  it("is undefined for a missing key", () => {
    expect(readSetting(fakeStorage(), "missing", decodeBoolean)).toBeUndefined();
  });

  it("is undefined for a value the decoder rejects", () => {
    const storage = fakeStorage({ "cozycubes:cube-size": "9" });
    expect(readSetting(storage, "cozycubes:cube-size", decodeCubeSize)).toBeUndefined();
  });

  it("is undefined when storage is unavailable or throws", () => {
    expect(readSetting(undefined, "cozycubes:cube-size", decodeCubeSize)).toBeUndefined();
    expect(readSetting(throwingStorage, "cozycubes:cube-size", decodeCubeSize)).toBeUndefined();
  });
});

describe("writeSetting", () => {
  it("round-trips through readSetting", () => {
    const storage = fakeStorage();
    writeSetting(storage, "cozycubes:shader-enabled", false);
    writeSetting(storage, "cozycubes:cube-size", 5);
    expect(readSetting(storage, "cozycubes:shader-enabled", decodeBoolean)).toBe(false);
    expect(readSetting(storage, "cozycubes:cube-size", decodeCubeSize)).toBe(5);
  });

  it("swallows a storage that refuses writes", () => {
    expect(() => writeSetting(throwingStorage, "cozycubes:cube-size", 3)).not.toThrow();
    expect(() => writeSetting(undefined, "cozycubes:cube-size", 3)).not.toThrow();
  });
});

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ModeType = "dot" | "image" | "studio";
type ShapeType = "circle" | "star" | "square" | "crescent" | "image";

interface StudioShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
  imageSrc?: string;
  imageAspect?: number;
}
type ThemeType = "default" | "mono";
type PatternType = "grid" | "brick" | "diagonal" | "diamond";
type UnitType = "mm" | "px";
type PaperPresetId = "A3" | "A4" | "A5" | "A6" | "Letter" | "Custom";
type EffectType = "pop" | "hot-noise" | "bayer" | "dot-matrix" | "ascii";
type BayerPreset = "checker" | "diagonals" | "bayer2" | "bayer4" | "bayer8" | "bayer16" | "clear" | "custom";

type Dot = {
  x: number;
  y: number;
  r: number;
  color: string;
};

type PatternPreset = {
  name: string;
  pattern: PatternType;
  backgroundColor: string;
  dotColor: string;
  altDotColor: string;
  useAltColor: boolean;
  dotRadiusMm: number;
  gapXmm: number;
  gapYmm: number;
  jitterMm: number;
  rotation: number;
  scale: number;
};

type GradientStop = {
  pos: number;
  color: [number, number, number];
};

const MM_TO_PX = 3.7795275591;
const PX_TO_MM = 1 / MM_TO_PX;

const PATTERN_LABELS: Record<PatternType, string> = {
  grid: "规则网格",
  brick: "错列排布",
  diagonal: "对角延展",
  diamond: "菱形排列",
};

const PAPER_PRESETS: Record<Exclude<PaperPresetId, "Custom">, { widthMm: number; heightMm: number }> = {
  A3: { widthMm: 297, heightMm: 420 },
  A4: { widthMm: 210, heightMm: 297 },
  A5: { widthMm: 148, heightMm: 210 },
  A6: { widthMm: 105, heightMm: 148 },
  Letter: { widthMm: 216, heightMm: 279 },
};

const STYLE_PRESETS: PatternPreset[] = [
  {
    name: "复古海报",
    pattern: "brick",
    backgroundColor: "#f7f2dc",
    dotColor: "#093d52",
    altDotColor: "#eb7f2f",
    useAltColor: true,
    dotRadiusMm: 3.8,
    gapXmm: 8.8,
    gapYmm: 8.8,
    jitterMm: 0.3,
    rotation: 0,
    scale: 100,
  },
  {
    name: "糖果跳色",
    pattern: "diamond",
    backgroundColor: "#fff6f1",
    dotColor: "#ff5e5b",
    altDotColor: "#1b998b",
    useAltColor: true,
    dotRadiusMm: 3.4,
    gapXmm: 9.5,
    gapYmm: 9,
    jitterMm: 0,
    rotation: 6,
    scale: 108,
  },
  {
    name: "工作室黑白",
    pattern: "grid",
    backgroundColor: "#f4f4f1",
    dotColor: "#202323",
    altDotColor: "#202323",
    useAltColor: false,
    dotRadiusMm: 2.6,
    gapXmm: 7,
    gapYmm: 7,
    jitterMm: 0,
    rotation: 0,
    scale: 100,
  },
  {
    name: "海洋律动",
    pattern: "diagonal",
    backgroundColor: "#eef8ff",
    dotColor: "#1d5f8f",
    altDotColor: "#53a3d9",
    useAltColor: true,
    dotRadiusMm: 3,
    gapXmm: 8,
    gapYmm: 8,
    jitterMm: 0.8,
    rotation: -10,
    scale: 114,
  },
];

const HEAT_GRADIENT: GradientStop[] = [
  { pos: 0, color: [12, 6, 28] },
  { pos: 0.2, color: [72, 16, 110] },
  { pos: 0.4, color: [160, 24, 90] },
  { pos: 0.6, color: [230, 60, 50] },
  { pos: 0.8, color: [255, 150, 30] },
  { pos: 1, color: [255, 240, 120] },
];

const POP_PALETTES: Array<Array<[number, number, number]>> = [
  [
    [13, 17, 56],
    [16, 110, 190],
    [255, 202, 32],
    [243, 71, 36],
  ],
  [
    [22, 42, 54],
    [66, 170, 144],
    [255, 232, 152],
    [242, 84, 104],
  ],
  [
    [34, 22, 66],
    [66, 72, 180],
    [252, 115, 82],
    [255, 224, 124],
  ],
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeFloat(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mmToPx(mm: number): number {
  return mm * MM_TO_PX;
}

function pxToMm(px: number): number {
  return px * PX_TO_MM;
}

function seededNoise(index: number, seed: number): number {
  const raw = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453;
  return raw - Math.floor(raw);
}

function getHeatColor(intensity: number): [number, number, number] {
  const safe = clamp(intensity, 0, 1);

  for (let i = 0; i < HEAT_GRADIENT.length - 1; i += 1) {
    const current = HEAT_GRADIENT[i];
    const next = HEAT_GRADIENT[i + 1];

    if (safe >= current.pos && safe <= next.pos) {
      const t = (safe - current.pos) / (next.pos - current.pos);
      return [
        Math.round(lerp(current.color[0], next.color[0], t)),
        Math.round(lerp(current.color[1], next.color[1], t)),
        Math.round(lerp(current.color[2], next.color[2], t)),
      ];
    }
  }

  return HEAT_GRADIENT[HEAT_GRADIENT.length - 1].color;
}

function formatValue(mm: number, unit: UnitType): string {
  if (unit === "mm") {
    return `${mm.toFixed(1)} mm`;
  }

  return `${mmToPx(mm).toFixed(0)} 像素`;
}

function applyPopEffect(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  paletteIndex: number,
  levels: number,
  contrast: number,
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(data.length);
  const palette = POP_PALETTES[paletteIndex % POP_PALETTES.length];
  const safeLevels = clamp(levels, 2, 8);

  for (let i = 0; i < width * height; i += 1) {
    const offset = i * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const a = data[offset + 3];

    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const contrasted = clamp((luminance - 0.5) * contrast + 0.5, 0, 1);
    const stepped = Math.round(contrasted * (safeLevels - 1)) / (safeLevels - 1);
    const colorIndex = clamp(Math.floor(stepped * palette.length), 0, palette.length - 1);

    output[offset] = palette[colorIndex][0];
    output[offset + 1] = palette[colorIndex][1];
    output[offset + 2] = palette[colorIndex][2];
    output[offset + 3] = a;
  }

  return output;
}

function applyHotNoiseEffect(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  heat: number,
  grain: number,
  seed: number,
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(data.length);
  const safeHeat = clamp(heat, 0, 1.5);
  const safeGrain = clamp(grain, 0, 0.7);

  for (let i = 0; i < width * height; i += 1) {
    const offset = i * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];

    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const noise = (seededNoise(i, seed) - 0.5) * 2;
    const boosted = clamp(luminance * safeHeat + noise * safeGrain, 0, 1);

    const [hr, hg, hb] = getHeatColor(boosted);
    output[offset] = hr;
    output[offset + 1] = hg;
    output[offset + 2] = hb;
    output[offset + 3] = data[offset + 3];
  }

  return output;
}

function generateBayerMatrix(order: number): { width: number; height: number; thresholds: number[] } {
  const safeOrder = clamp(Math.round(order), 2, 32);
  let size = 1;
  let matrix = [[0]];

  while (size < safeOrder) {
    const nextSize = size * 2;
    const next: number[][] = Array.from({ length: nextSize }, () => Array(nextSize).fill(0));

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const value = matrix[y][x] * 4;
        next[y][x] = value;
        next[y][x + size] = value + 2;
        next[y + size][x] = value + 3;
        next[y + size][x + size] = value + 1;
      }
    }

    matrix = next;
    size = nextSize;
  }

  const max = size * size;
  const thresholds = matrix.flat().map((value) => (value + 0.5) / max);
  return { width: size, height: size, thresholds };
}

function generateCheckerMatrix(width: number, height: number): number[] {
  const safeWidth = clamp(Math.round(width), 2, 32);
  const safeHeight = clamp(Math.round(height), 2, 32);
  const values: number[] = [];

  for (let y = 0; y < safeHeight; y += 1) {
    for (let x = 0; x < safeWidth; x += 1) {
      values.push((x + y) % 2 === 0 ? 0.25 : 0.75);
    }
  }

  return values;
}

function generateDiagonalMatrix(width: number, height: number): number[] {
  const safeWidth = clamp(Math.round(width), 2, 32);
  const safeHeight = clamp(Math.round(height), 2, 32);
  const divisor = Math.max(2, safeWidth + safeHeight - 2);
  const values: number[] = [];

  for (let y = 0; y < safeHeight; y += 1) {
    for (let x = 0; x < safeWidth; x += 1) {
      values.push((x + y + 0.5) / divisor);
    }
  }

  return values;
}

function generateClearMatrix(width: number, height: number): number[] {
  const safeWidth = clamp(Math.round(width), 2, 32);
  const safeHeight = clamp(Math.round(height), 2, 32);
  return Array.from({ length: safeWidth * safeHeight }, () => 0.5);
}

function applyBayerEffect(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  thresholds: number[],
  matrixWidth: number,
  matrixHeight: number,
  steps: number,
  brightness: number,
  contrast: number,
  grayscale: boolean,
  invert: boolean,
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(data.length);
  const safeWidth = clamp(Math.round(matrixWidth), 2, 32);
  const safeHeight = clamp(Math.round(matrixHeight), 2, 32);
  const safeSteps = clamp(Math.round(steps), 1, 32);
  const layerRange = Math.max(1, safeSteps - 1);
  const safeBrightness = clamp(brightness, 0.2, 2.5);
  const safeContrast = clamp(contrast, 0.2, 3);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const sourceR = data[index] / 255;
      const sourceG = data[index + 1] / 255;
      const sourceB = data[index + 2] / 255;

      let lum = 0.2126 * sourceR + 0.7152 * sourceG + 0.0722 * sourceB;
      lum = clamp((lum - 0.5) * safeContrast + 0.5, 0, 1);
      lum = clamp(lum * safeBrightness, 0, 1);
      if (invert) {
        lum = 1 - lum;
      }

      const scaled = lum * layerRange;
      const base = Math.floor(scaled);
      const frac = scaled - base;

      const tIndex = (y % safeHeight) * safeWidth + (x % safeWidth);
      const threshold = thresholds[tIndex] ?? 0.5;
      const lifted = base + (frac >= threshold ? 1 : 0);
      const quantized = clamp(lifted / layerRange, 0, 1);
      const mono = Math.round(quantized * 255);

      if (grayscale) {
        output[index] = mono;
        output[index + 1] = mono;
        output[index + 2] = mono;
      } else {
        const ratio = quantized;
        output[index] = Math.round(data[index] * ratio);
        output[index + 1] = Math.round(data[index + 1] * ratio);
        output[index + 2] = Math.round(data[index + 2] * ratio);
      }

      output[index + 3] = data[index + 3];
    }
  }

  return output;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length !== 6) {
    return [0, 0, 0];
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  if ([r, g, b].some((value) => Number.isNaN(value))) {
    return [0, 0, 0];
  }

  return [r, g, b];
}

function renderDotMatrixEffect(
  ctx: CanvasRenderingContext2D,
  source: Uint8ClampedArray,
  width: number,
  height: number,
  pointSize: number,
  density: number,
  stretch: number,
  spacingX: number,
  spacingY: number,
  regionSize: number,
  backgroundHex: string,
  pointHex: string,
  useSourceColor: boolean,
): void {
  const safeDensity = clamp(Math.round(density), 4, 40);
  const safePointSize = clamp(pointSize, 0.2, 2.2);
  const safeStretch = clamp(stretch, 0.3, 3);
  const safeSpacingX = clamp(spacingX, 0.4, 2.6);
  const safeSpacingY = clamp(spacingY, 0.4, 2.6);
  const safeRegion = clamp(Math.round(regionSize), 2, 24);

  const baseStep = safeDensity;
  const stepX = Math.max(2, Math.round(baseStep * safeSpacingX));
  const stepY = Math.max(2, Math.round(baseStep * safeSpacingY));
  const baseRadius = Math.max(0.6, (baseStep * 0.35) * safePointSize);

  const [pointR, pointG, pointB] = hexToRgb(pointHex);
  ctx.fillStyle = backgroundHex;
  ctx.fillRect(0, 0, width, height);

  for (let cy = Math.floor(stepY / 2); cy < height; cy += stepY) {
    for (let cx = Math.floor(stepX / 2); cx < width; cx += stepX) {
      let totalR = 0;
      let totalG = 0;
      let totalB = 0;
      let count = 0;

      const startY = Math.max(0, cy - Math.floor(safeRegion / 2));
      const endY = Math.min(height, startY + safeRegion);
      const startX = Math.max(0, cx - Math.floor(safeRegion / 2));
      const endX = Math.min(width, startX + safeRegion);

      for (let y = startY; y < endY; y += 1) {
        for (let x = startX; x < endX; x += 1) {
          const idx = (y * width + x) * 4;
          totalR += source[idx];
          totalG += source[idx + 1];
          totalB += source[idx + 2];
          count += 1;
        }
      }

      if (count === 0) {
        continue;
      }

      const avgR = totalR / count;
      const avgG = totalG / count;
      const avgB = totalB / count;
      const luminance = (0.2126 * avgR + 0.7152 * avgG + 0.0722 * avgB) / 255;
      const tone = 1 - luminance;

      const radiusY = Math.max(0.5, baseRadius * (0.2 + tone * 1.15));
      const radiusX = Math.max(0.5, radiusY * safeStretch);

      const fillR = useSourceColor ? avgR : pointR;
      const fillG = useSourceColor ? avgG : pointG;
      const fillB = useSourceColor ? avgB : pointB;

      ctx.beginPath();
      ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${Math.round(fillR)}, ${Math.round(fillG)}, ${Math.round(fillB)})`;
      ctx.fill();
    }
  }
}

function renderAsciiEffect(
  ctx: CanvasRenderingContext2D,
  source: Uint8ClampedArray,
  width: number,
  height: number,
  columns: number,
  rows: number,
  charset: string,
  brightness: number,
  contrast: number,
  invert: boolean,
  useSourceColor: boolean,
  backgroundHex: string,
  foregroundHex: string,
): void {
  const safeColumns = clamp(Math.round(columns), 12, 240);
  const safeRows = clamp(Math.round(rows), 8, 160);
  const safeBrightness = clamp(brightness, 0.2, 2.5);
  const safeContrast = clamp(contrast, 0.2, 3);
  const mapChars = (charset.trim().length > 1 ? charset : ".:-=+*#%@").split("");
  const cellWidth = width / safeColumns;
  const cellHeight = height / safeRows;
  const sampleW = Math.max(1, Math.floor(cellWidth));
  const sampleH = Math.max(1, Math.floor(cellHeight));
  const [fixedR, fixedG, fixedB] = hexToRgb(foregroundHex);

  ctx.fillStyle = backgroundHex;
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.max(8, Math.floor(cellHeight * 0.88))}px "IBM Plex Mono", "JetBrains Mono", monospace`;

  for (let row = 0; row < safeRows; row += 1) {
    for (let col = 0; col < safeColumns; col += 1) {
      const startX = Math.floor(col * cellWidth);
      const startY = Math.floor(row * cellHeight);

      let totalR = 0;
      let totalG = 0;
      let totalB = 0;
      let count = 0;

      for (let y = 0; y < sampleH && startY + y < height; y += 1) {
        for (let x = 0; x < sampleW && startX + x < width; x += 1) {
          const idx = ((startY + y) * width + (startX + x)) * 4;
          totalR += source[idx];
          totalG += source[idx + 1];
          totalB += source[idx + 2];
          count += 1;
        }
      }

      if (count === 0) {
        continue;
      }

      const avgR = totalR / count;
      const avgG = totalG / count;
      const avgB = totalB / count;

      let lum = (0.2126 * avgR + 0.7152 * avgG + 0.0722 * avgB) / 255;
      lum = clamp((lum - 0.5) * safeContrast + 0.5, 0, 1);
      lum = clamp(lum * safeBrightness, 0, 1);
      if (invert) {
        lum = 1 - lum;
      }

      const charIndex = clamp(Math.floor((1 - lum) * (mapChars.length - 1)), 0, mapChars.length - 1);
      const glyph = mapChars[charIndex];

      const drawR = useSourceColor ? Math.round(avgR) : fixedR;
      const drawG = useSourceColor ? Math.round(avgG) : fixedG;
      const drawB = useSourceColor ? Math.round(avgB) : fixedB;
      ctx.fillStyle = `rgb(${drawR}, ${drawG}, ${drawB})`;
      ctx.fillText(glyph, startX + cellWidth / 2, startY + cellHeight / 2);
    }
  }
}

export default function Home() {
  const [mode, setMode] = useState<ModeType>("dot");
  const [theme, setTheme] = useState<ThemeType>("default");

  const [unit, setUnit] = useState<UnitType>("mm");
  const [paperPreset, setPaperPreset] = useState<PaperPresetId>("A4");
  const [pageWidthMm, setPageWidthMm] = useState(210);
  const [pageHeightMm, setPageHeightMm] = useState(297);

  const [marginTopMm, setMarginTopMm] = useState(12);
  const [marginRightMm, setMarginRightMm] = useState(12);
  const [marginBottomMm, setMarginBottomMm] = useState(12);
  const [marginLeftMm, setMarginLeftMm] = useState(12);

  const [backgroundColor, setBackgroundColor] = useState("#f7f2dc");
  const [dotColor, setDotColor] = useState("#093d52");
  const [altDotColor, setAltDotColor] = useState("#eb7f2f");
  const [useAltColor, setUseAltColor] = useState(true);

  const [dotRadiusMm, setDotRadiusMm] = useState(3.8);
  const [gapXmm, setGapXmm] = useState(8.8);
  const [gapYmm, setGapYmm] = useState(8.8);
  const [jitterMm, setJitterMm] = useState(0.4);

  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(100);
  const [dotSeed, setDotSeed] = useState(1);
  const [pattern, setPattern] = useState<PatternType>("brick");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const matrixPaintModeRef = useRef<"draw" | "erase" | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [effect, setEffect] = useState<EffectType>("pop");
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [levels, setLevels] = useState(4);
  const [contrast, setContrast] = useState(1.35);
  const [heat, setHeat] = useState(1.08);
  const [grain, setGrain] = useState(0.22);
  const [bayerPreset, setBayerPreset] = useState<BayerPreset>("bayer4");
  const [bayerSteps, setBayerSteps] = useState(4);
  const [bayerEditLevel, setBayerEditLevel] = useState(0);
  const [bayerWidth, setBayerWidth] = useState(4);
  const [bayerHeight, setBayerHeight] = useState(4);
  const [bayerThresholds, setBayerThresholds] = useState<number[]>(() => generateBayerMatrix(4).thresholds);
  const [bayerPixelScale, setBayerPixelScale] = useState(2);
  const [bayerBrightness, setBayerBrightness] = useState(1);
  const [bayerContrast, setBayerContrast] = useState(1);
  const [bayerGrayscale, setBayerGrayscale] = useState(true);
  const [bayerInvert, setBayerInvert] = useState(false);
  const [isMatrixPainting, setIsMatrixPainting] = useState(false);
  const [imageSeed, setImageSeed] = useState(8);
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number } | null>(null);
  const [dmPointSize, setDmPointSize] = useState(0.9);
  const [dmDensity, setDmDensity] = useState(12);
  const [dmStretch, setDmStretch] = useState(1);
  const [dmSpacingX, setDmSpacingX] = useState(0.8);
  const [dmSpacingY, setDmSpacingY] = useState(0.8);
  const [dmRegionSize, setDmRegionSize] = useState(6);
  const [dmBackgroundColor, setDmBackgroundColor] = useState("#f4f4f4");
  const [dmPointColor, setDmPointColor] = useState("#111111");
  const [dmUseImageColor, setDmUseImageColor] = useState(true);
  const [asciiColumns, setAsciiColumns] = useState(64);
  const [asciiRows, setAsciiRows] = useState(36);
  const [asciiCharset, setAsciiCharset] = useState(" .:-=+*#%@");
  const [asciiBrightness, setAsciiBrightness] = useState(1);
  const [asciiContrast, setAsciiContrast] = useState(1.1);
  const [asciiInvert, setAsciiInvert] = useState(false);
  const [asciiUseImageColor, setAsciiUseImageColor] = useState(false);
  const [asciiBackgroundColor, setAsciiBackgroundColor] = useState("#f2f2f2");
  const [asciiForegroundColor, setAsciiForegroundColor] = useState("#111111");

  const [studioShapes, setStudioShapes] = useState<StudioShape[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [studioBackgroundColor, setStudioBackgroundColor] = useState("#ffffff");
  const [studioBackgroundImage, setStudioBackgroundImage] = useState<string | null>(null);

  const pageWidthPx = useMemo(() => mmToPx(pageWidthMm), [pageWidthMm]);
  const pageHeightPx = useMemo(() => mmToPx(pageHeightMm), [pageHeightMm]);

  const safeBounds = useMemo(() => {
    const marginTopPx = mmToPx(marginTopMm);
    const marginRightPx = mmToPx(marginRightMm);
    const marginBottomPx = mmToPx(marginBottomMm);
    const marginLeftPx = mmToPx(marginLeftMm);

    const x = normalizeFloat(marginLeftPx);
    const y = normalizeFloat(marginTopPx);
    const width = normalizeFloat(Math.max(20, pageWidthPx - marginLeftPx - marginRightPx));
    const height = normalizeFloat(Math.max(20, pageHeightPx - marginTopPx - marginBottomPx));

    return { x, y, width, height };
  }, [marginBottomMm, marginLeftMm, marginRightMm, marginTopMm, pageHeightPx, pageWidthPx]);

  const dots = useMemo(() => {
    const points: Dot[] = [];
    const safeGapX = Math.max(mmToPx(1), mmToPx(gapXmm));
    const safeGapY = Math.max(mmToPx(1), mmToPx(gapYmm));
    const safeRadius = clamp(mmToPx(dotRadiusMm), 1, 300);
    const jitterPx = mmToPx(jitterMm);

    const cols = Math.ceil(safeBounds.width / safeGapX) + 6;
    const rows = Math.ceil(safeBounds.height / safeGapY) + 6;

    for (let row = -3; row < rows; row += 1) {
      for (let col = -3; col < cols; col += 1) {
        let x = safeBounds.x + col * safeGapX;
        let y = safeBounds.y + row * safeGapY;

        if (pattern === "brick") {
          x += row % 2 === 0 ? 0 : safeGapX * 0.5;
        }

        if (pattern === "diagonal") {
          x += row * safeGapX * 0.35;
        }

        if (pattern === "diamond") {
          x += row % 2 === 0 ? 0 : safeGapX * 0.5;
          y = safeBounds.y + row * safeGapY * 0.78;
        }

        if (jitterPx > 0) {
          const idx = row * 1024 + col;
          const dx = (seededNoise(idx, dotSeed) - 0.5) * 2 * jitterPx;
          const dy = (seededNoise(idx + 500_000, dotSeed) - 0.5) * 2 * jitterPx;
          x += dx;
          y += dy;
        }

        if (x < safeBounds.x - safeRadius || x > safeBounds.x + safeBounds.width + safeRadius) {
          continue;
        }

        if (y < safeBounds.y - safeRadius || y > safeBounds.y + safeBounds.height + safeRadius) {
          continue;
        }

        const color = useAltColor && (row + col) % 2 === 0 ? altDotColor : dotColor;
        points.push({
          x: normalizeFloat(x),
          y: normalizeFloat(y),
          r: normalizeFloat(safeRadius),
          color,
        });
      }
    }

    return points;
  }, [altDotColor, dotColor, dotRadiusMm, dotSeed, gapXmm, gapYmm, jitterMm, pattern, safeBounds, useAltColor]);

  const patternTransform = useMemo(() => {
    const centerX = normalizeFloat(safeBounds.x + safeBounds.width / 2);
    const centerY = normalizeFloat(safeBounds.y + safeBounds.height / 2);
    const scaleFactor = scale / 100;
    return `translate(${centerX} ${centerY}) rotate(${rotation}) scale(${scaleFactor}) translate(${-centerX} ${-centerY})`;
  }, [rotation, safeBounds, scale]);

  const svgMarkup = useMemo(() => {
    const circles = dots
      .map(
        (dot) =>
          `<circle cx="${dot.x.toFixed(2)}" cy="${dot.y.toFixed(2)}" r="${dot.r.toFixed(2)}" fill="${dot.color}" />`,
      )
      .join("\n");

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${pageWidthMm}mm" height="${pageHeightMm}mm" viewBox="0 0 ${pageWidthPx} ${pageHeightPx}">`,
      `<rect width="100%" height="100%" fill="${backgroundColor}" />`,
      `<clipPath id="safe-area">`,
      `<rect x="${safeBounds.x}" y="${safeBounds.y}" width="${safeBounds.width}" height="${safeBounds.height}" />`,
      `</clipPath>`,
      `<g transform="${patternTransform}" clip-path="url(#safe-area)">`,
      circles,
      "</g>",
      `</svg>`,
    ].join("\n");
  }, [backgroundColor, dots, pageHeightMm, pageHeightPx, pageWidthMm, pageWidthPx, patternTransform, safeBounds]);

  useEffect(() => {
    if (!imageSrc || !canvasRef.current) {
      return;
    }

    const img = new Image();
    img.onload = () => {
      if (!canvasRef.current) {
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      setImageInfo({ width: img.naturalWidth, height: img.naturalHeight });

      ctx.drawImage(img, 0, 0);
      const sourceImage = ctx.getImageData(0, 0, canvas.width, canvas.height);

      let processedPixels: Uint8ClampedArray;
      if (effect === "pop") {
        processedPixels = applyPopEffect(sourceImage.data, canvas.width, canvas.height, paletteIndex, levels, contrast);
        const nextFrame = ctx.createImageData(canvas.width, canvas.height);
        nextFrame.data.set(processedPixels);
        ctx.putImageData(nextFrame, 0, 0);
      } else if (effect === "hot-noise") {
        processedPixels = applyHotNoiseEffect(sourceImage.data, canvas.width, canvas.height, heat, grain, imageSeed);
        const nextFrame = ctx.createImageData(canvas.width, canvas.height);
        nextFrame.data.set(processedPixels);
        ctx.putImageData(nextFrame, 0, 0);
      } else if (effect === "dot-matrix") {
        renderDotMatrixEffect(
          ctx,
          sourceImage.data,
          canvas.width,
          canvas.height,
          dmPointSize,
          dmDensity,
          dmStretch,
          dmSpacingX,
          dmSpacingY,
          dmRegionSize,
          dmBackgroundColor,
          dmPointColor,
          dmUseImageColor,
        );
      } else if (effect === "ascii") {
        renderAsciiEffect(
          ctx,
          sourceImage.data,
          canvas.width,
          canvas.height,
          asciiColumns,
          asciiRows,
          asciiCharset,
          asciiBrightness,
          asciiContrast,
          asciiInvert,
          asciiUseImageColor,
          asciiBackgroundColor,
          asciiForegroundColor,
        );
      } else {
        const safePixelScale = clamp(Math.round(bayerPixelScale), 1, 12);
        const workWidth = Math.max(1, Math.floor(canvas.width / safePixelScale));
        const workHeight = Math.max(1, Math.floor(canvas.height / safePixelScale));

        const workCanvas = document.createElement("canvas");
        workCanvas.width = workWidth;
        workCanvas.height = workHeight;
        const workCtx = workCanvas.getContext("2d");

        if (!workCtx) {
          return;
        }

        workCtx.imageSmoothingEnabled = true;
        workCtx.drawImage(img, 0, 0, workWidth, workHeight);
        const sourceSmall = workCtx.getImageData(0, 0, workWidth, workHeight);

        processedPixels = applyBayerEffect(
          sourceSmall.data,
          workWidth,
          workHeight,
          bayerThresholds,
          bayerWidth,
          bayerHeight,
          bayerSteps,
          bayerBrightness,
          bayerContrast,
          bayerGrayscale,
          bayerInvert,
        );

        const nextSmall = workCtx.createImageData(workWidth, workHeight);
        nextSmall.data.set(processedPixels);
        workCtx.putImageData(nextSmall, 0, 0);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(workCanvas, 0, 0, canvas.width, canvas.height);
      }
    };

    img.src = imageSrc;
  }, [
    asciiBackgroundColor,
    asciiBrightness,
    asciiCharset,
    asciiColumns,
    asciiContrast,
    asciiForegroundColor,
    asciiInvert,
    asciiRows,
    asciiUseImageColor,
    bayerHeight,
    bayerBrightness,
    bayerContrast,
    bayerGrayscale,
    bayerInvert,
    bayerPixelScale,
    bayerSteps,
    bayerThresholds,
    bayerWidth,
    contrast,
    dmBackgroundColor,
    dmDensity,
    dmPointColor,
    dmPointSize,
    dmRegionSize,
    dmSpacingX,
    dmSpacingY,
    dmStretch,
    dmUseImageColor,
    effect,
    grain,
    heat,
    imageSeed,
    imageSrc,
    levels,
    paletteIndex,
  ]);

  const effectHint = useMemo(() => {
    if (effect === "pop") {
      return "波普化会把图像压缩成高对比色块，适合海报和封面风格。";
    }

    if (effect === "hot-noise") {
      return "热噪点化会把亮度映射到热力色带，并叠加噪点纹理。";
    }

    if (effect === "dot-matrix") {
      return "点阵图案生成器会把图片重构为可控点阵，可调点大小、密度、间距、椭圆拉伸和配色。";
    }

    if (effect === "ascii") {
      return "ASCII码化会把图像重建为字符画，可调列数、行数、字符集、亮度对比和反相。";
    }

    return "拜耳风格化支持手动编辑阈值矩阵，并可调灰度、反相、steps、pixel scale、亮度和对比度。";
  }, [effect]);

  const applyBayerPreset = (preset: BayerPreset) => {
    setBayerPreset(preset);

    if (preset === "checker") {
      setBayerThresholds(generateCheckerMatrix(bayerWidth, bayerHeight));
      return;
    }

    if (preset === "diagonals") {
      setBayerThresholds(generateDiagonalMatrix(bayerWidth, bayerHeight));
      return;
    }

    if (preset === "clear") {
      setBayerThresholds(generateClearMatrix(bayerWidth, bayerHeight));
      return;
    }

    const order = preset === "bayer2" ? 2 : preset === "bayer4" ? 4 : preset === "bayer8" ? 8 : 16;
    const matrix = generateBayerMatrix(order);
    setBayerWidth(matrix.width);
    setBayerHeight(matrix.height);
    setBayerThresholds(matrix.thresholds);
  };

  const randomizeBayerMatrix = () => {
    const total = bayerWidth * bayerHeight;
    const next = Array.from({ length: total }, () => Math.random());
    setBayerPreset("custom");
    setBayerThresholds(next);
  };

  const setBayerCellThreshold = (index: number) => {
    setBayerCellWithMode(index, "draw");
  };

  const setBayerCellWithMode = (index: number, mode: "draw" | "erase") => {
    const safeSteps = clamp(Math.round(bayerSteps), 1, 32);
    const safeLevel = clamp(Math.round(bayerEditLevel), 0, Math.max(0, safeSteps - 1));
    const value = mode === "erase" ? 0.5 : safeSteps <= 1 ? 0.5 : safeLevel / (safeSteps - 1);

    setBayerPreset("custom");
    setBayerThresholds((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleMatrixMouseDown = (index: number, event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (event.button !== 0 && event.button !== 2) {
      return;
    }

    const mode = event.button === 2 ? "erase" : "draw";
    matrixPaintModeRef.current = mode;
    setIsMatrixPainting(true);
    setBayerCellWithMode(index, mode);
  };

  const handleMatrixMouseEnter = (index: number) => {
    if (!isMatrixPainting || !matrixPaintModeRef.current) {
      return;
    }

    setBayerCellWithMode(index, matrixPaintModeRef.current);
  };

  useEffect(() => {
    const finishPainting = () => {
      setIsMatrixPainting(false);
      matrixPaintModeRef.current = null;
    };

    window.addEventListener("mouseup", finishPainting);
    return () => {
      window.removeEventListener("mouseup", finishPainting);
    };
  }, []);

  const updateCustomBayerSize = (nextWidth: number, nextHeight: number) => {
    const safeWidth = clamp(Math.round(nextWidth), 2, 32);
    const safeHeight = clamp(Math.round(nextHeight), 2, 32);
    setBayerPreset("custom");
    setBayerWidth(safeWidth);
    setBayerHeight(safeHeight);
    setBayerThresholds(generateClearMatrix(safeWidth, safeHeight));
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  const exportDotSvg = () => {
    const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "波点图案.svg";
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportDotPng = () => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(pageWidthPx);
    canvas.height = Math.round(pageHeightPx);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, pageWidthPx, pageHeightPx);

    ctx.save();
    ctx.beginPath();
    ctx.rect(safeBounds.x, safeBounds.y, safeBounds.width, safeBounds.height);
    ctx.clip();

    ctx.translate(safeBounds.x + safeBounds.width / 2, safeBounds.y + safeBounds.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale / 100, scale / 100);
    ctx.translate(-(safeBounds.x + safeBounds.width / 2), -(safeBounds.y + safeBounds.height / 2));

    for (const dot of dots) {
      ctx.beginPath();
      ctx.fillStyle = dot.color;
      ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "波点图案.png";
    link.click();
  };

  const exportImagePng = () => {
    if (!canvasRef.current) {
      return;
    }

    const link = document.createElement("a");
    link.href = canvasRef.current.toDataURL("image/png");
    link.download = "图片风格化.png";
    link.click();
  };

  const applyPaperPreset = (preset: PaperPresetId) => {
    setPaperPreset(preset);
    if (preset === "Custom") {
      return;
    }

    setPageWidthMm(PAPER_PRESETS[preset].widthMm);
    setPageHeightMm(PAPER_PRESETS[preset].heightMm);
  };

  const flipOrientation = () => {
    setPageWidthMm(pageHeightMm);
    setPageHeightMm(pageWidthMm);
    setPaperPreset("Custom");
  };

  const applyStylePreset = (preset: PatternPreset) => {
    setPattern(preset.pattern);
    setBackgroundColor(preset.backgroundColor);
    setDotColor(preset.dotColor);
    setAltDotColor(preset.altDotColor);
    setUseAltColor(preset.useAltColor);
    setDotRadiusMm(preset.dotRadiusMm);
    setGapXmm(preset.gapXmm);
    setGapYmm(preset.gapYmm);
    setJitterMm(preset.jitterMm);
    setRotation(preset.rotation);
    setScale(preset.scale);
  };

  const readNumberAsMm = (rawValue: string) => {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return 0;
    }

    return unit === "mm" ? parsed : pxToMm(parsed);
  };

  const displayNumber = (mmValue: number, digits = 1) => {
    if (unit === "mm") {
      return mmValue.toFixed(digits);
    }

    return mmToPx(mmValue).toFixed(0);
  };

  const addStudioShape = (type: ShapeType, imageSrc?: string, imageAspect?: number) => {
    const newShape: StudioShape = {
      id: crypto.randomUUID(),
      type,
      x: pageWidthPx / 2,
      y: pageHeightPx / 2,
      size: Math.min(pageWidthPx, pageHeightPx) * (type === "image" ? 0.3 : 0.1),
      color: "#093d52",
      rotation: 0,
      imageSrc,
      imageAspect,
    };
    setStudioShapes([...studioShapes, newShape]);
    setSelectedShapeId(newShape.id);
  };

  const handleStudioImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = String(e.target?.result);
      const img = new Image();
      img.onload = () => {
        addStudioShape("image", src, img.width / img.height);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleStudioBgImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = String(e.target?.result);
      const img = new Image();
      img.onload = () => {
        setStudioBackgroundImage(src);
        setPageWidthMm(pxToMm(img.width));
        setPageHeightMm(pxToMm(img.height));
        setPaperPreset("Custom");
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const updateStudioShape = (id: string, updates: Partial<StudioShape>) => {
    setStudioShapes((prev) => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeStudioShape = (id: string) => {
    setStudioShapes((prev) => prev.filter(s => s.id !== id));
    if (selectedShapeId === id) {
       setSelectedShapeId(null);
    }
  };

  const selectedShape = useMemo(() => studioShapes.find(s => s.id === selectedShapeId), [selectedShapeId, studioShapes]);

  const studioSvgMarkup = useMemo(() => {
    const shapesMarkup = studioShapes.map((shape) => {
      const { x, y, size, color, rotation } = shape;
      const transform = `rotate(${rotation} ${x} ${y})`;
      if (shape.type === "circle") {
        return `<circle cx="${x}" cy="${y}" r="${size}" fill="${color}" transform="${transform}" />`;
      }
      if (shape.type === "square") {
        return `<rect x="${x - size}" y="${y - size}" width="${size * 2}" height="${size * 2}" fill="${color}" transform="${transform}" />`;
      }
      if (shape.type === "star") {
        const pts = [];
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? size : size * 0.4;
          pts.push(`${x + r * Math.cos(angle)},${y + r * Math.sin(angle)}`);
        }
        return `<polygon points="${pts.join(" ")}" fill="${color}" transform="${transform}" />`;
      }
      if (shape.type === "crescent") {
        return `<path d="M ${x},${y - size} A ${size} ${size} 0 0 1 ${x},${y + size} A ${size * 0.8} ${size * 0.8} 0 0 0 ${x},${y - size} Z" fill="${color}" transform="${transform}" />`;
      }
      if (shape.type === "image" && shape.imageSrc) {
        const aspect = shape.imageAspect || 1;
        const w = size * 2;
        const h = w / aspect;
        return `<image href="${shape.imageSrc}" x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" transform="${transform}" preserveAspectRatio="none" />`;
      }
      return "";
    }).join("\n");

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${pageWidthMm}mm" height="${pageHeightMm}mm" viewBox="0 0 ${pageWidthPx} ${pageHeightPx}">`,
      `<rect width="100%" height="100%" fill="${studioBackgroundColor}" />`,
      studioBackgroundImage ? `<image href="${studioBackgroundImage}" x="0" y="0" width="${pageWidthPx}" height="${pageHeightPx}" preserveAspectRatio="none" />` : "",
      shapesMarkup,
      `</svg>`,
    ].filter(Boolean).join("\n");
  }, [pageHeightMm, pageHeightPx, pageWidthMm, pageWidthPx, studioBackgroundColor, studioBackgroundImage, studioShapes]);

  const exportStudioSvg = () => {
    const blob = new Blob([studioSvgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "加工站图案.svg";
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportStudioPng = () => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(pageWidthPx);
    canvas.height = Math.round(pageHeightPx);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = studioBackgroundColor;
    ctx.fillRect(0, 0, pageWidthPx, pageHeightPx);

    const img = new Image();
    const svgStr = encodeURIComponent(studioSvgMarkup);
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "加工站图案.png";
      link.click();
    };
    img.src = `data:image/svg+xml;charset=utf-8,${svgStr}`;
  };

  return (
    <div className={`dotlab-root ${theme === "mono" ? "theme-mono" : "theme-default"}`}>
      <header className="dotlab-topbar">
        <h1>波点工坊</h1>
        <div className="dotlab-topbar-right">
          <p>同一页面支持波点生成与图片风格化，两种功能可以随时切换使用。</p>
          <div className="dotlab-theme-switch" role="group" aria-label="主题切换">
            <button type="button" className={theme === "default" ? "active" : ""} onClick={() => setTheme("default")}>
              默认主题
            </button>
            <button type="button" className={theme === "mono" ? "active" : ""} onClick={() => setTheme("mono")}>
              终端黑白
            </button>
          </div>
        </div>
      </header>

      <main className="dotlab-main">
        <section className="dotlab-panel" aria-label="功能控制面板">
          <h2>MODE</h2>
          <div className="dotlab-unit-switch" role="group" aria-label="工作模式切换">
            <button type="button" className={mode === "dot" ? "active" : ""} onClick={() => setMode("dot")}>
              波点生成器
            </button>
            <button type="button" className={mode === "image" ? "active" : ""} onClick={() => setMode("image")}>
              图片风格化
            </button>
            <button type="button" className={mode === "studio" ? "active" : ""} onClick={() => setMode("studio")}>
              加工站
            </button>
          </div>

          {mode === "studio" && (
            <>
              <h2>DOCUMENT & LAYERS</h2>
              <div className="dotlab-unit-switch" role="group" aria-label="添加图形" style={{ flexWrap: 'wrap' }}>
                <button type="button" onClick={() => addStudioShape("circle")}>
                 + 波点
                </button>
                <button type="button" onClick={() => addStudioShape("star")}>
                 + 星星
                </button>
                <button type="button" onClick={() => addStudioShape("square")}>
                 + 方块
                </button>
                <button type="button" onClick={() => addStudioShape("crescent")}>
                 + 月牙
                </button>
                <div style={{ flexBasis: '100%', marginTop: '0.5rem' }}>
                  <label className="dotlab-upload-btn" style={{ display: 'block', padding: '0.5rem', background: 'var(--border)', cursor: 'pointer', textAlign: 'center', borderRadius: '4px', color: 'var(--text)' }}>
                    + 上传图片
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleStudioImageUpload} />
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '1.5rem 0' }}>
                {studioShapes.map((shape) => (
                  <div key={shape.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <label className="dotlab-checkbox" style={{ margin: 0 }}>
                       <input type="radio" checked={selectedShapeId === shape.id} onChange={() => setSelectedShapeId(shape.id)} />
                       {shape.type.toUpperCase()} ({shape.id.substring(0, 4)})
                     </label>
                     <button type="button" onClick={() => removeStudioShape(shape.id)} style={{ padding: '2px 8px', fontSize: '0.8rem', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' }}>x</button>
                  </div>
                ))}
              </div>

              {selectedShapeId && selectedShape && (
                <>
                  <h2>PROPERTIES</h2>
                  <div className="dotlab-grid-2">
                    <label>
                      X
                      <input
                         type="range" min="0" max={pageWidthPx} step="1"
                         value={Math.round(selectedShape.x)}
                         onChange={(e) => updateStudioShape(selectedShapeId, { x: Number(e.target.value) })}
                      />
                    </label>
                    <label>
                      Y
                      <input
                         type="range" min="0" max={pageHeightPx} step="1"
                         value={Math.round(selectedShape.y)}
                         onChange={(e) => updateStudioShape(selectedShapeId, { y: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                  <div className="dotlab-grid-2">
                    <label>
                      Size
                      <input
                         type="range" min="1" max={Math.max(pageWidthPx, pageHeightPx)} step="1"
                         value={Math.round(selectedShape.size)}
                         onChange={(e) => updateStudioShape(selectedShapeId, { size: Number(e.target.value) })}
                      />
                    </label>
                    <label>
                      Rot
                      <input
                         type="range" min="-180" max="180" step="1"
                         value={Math.round(selectedShape.rotation)}
                         onChange={(e) => updateStudioShape(selectedShapeId, { rotation: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                  <label>
                     Color
                     <input type="color" value={selectedShape.color} onChange={(e) => updateStudioShape(selectedShapeId, { color: e.target.value })} />
                  </label>
                </>
              )}

              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                 <label>
                    画布背景颜色
                    <input type="color" value={studioBackgroundColor} onChange={(e) => setStudioBackgroundColor(e.target.value)} />
                 </label>
                 <label className="dotlab-upload-btn" style={{ display: 'block', padding: '0.5rem', background: 'var(--border)', cursor: 'pointer', textAlign: 'center', borderRadius: '4px', color: 'var(--text)', marginTop: '0.5rem' }}>
                    {studioBackgroundImage ? "更换背景图片" : "+ 上传背景图片"}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleStudioBgImageUpload} />
                 </label>
                 {studioBackgroundImage && (
                    <button type="button" style={{ display: 'block', width: '100%', marginTop: '0.5rem' }} onClick={() => setStudioBackgroundImage(null)}>
                      移出背景图片
                    </button>
                 )}
              </div>

              <h2>OUTPUT</h2>
              <div className="dotlab-actions">
                <button type="button" onClick={exportStudioPng}>
                  导出 PNG
                </button>
                <button type="button" onClick={exportStudioSvg}>
                  导出 SVG
                </button>
              </div>
            </>
          )}

          {mode === "dot" && (
            <>
              <h2>DOCUMENT</h2>

              <div className="dotlab-unit-switch" role="group" aria-label="单位切换">
                <button type="button" className={unit === "mm" ? "active" : ""} onClick={() => setUnit("mm")}>
                  MM
                </button>
                <button type="button" className={unit === "px" ? "active" : ""} onClick={() => setUnit("px")}>
                  PX
                </button>
              </div>

              <label>
                纸张预设
                <select value={paperPreset} onChange={(event) => applyPaperPreset(event.target.value as PaperPresetId)}>
                  <option value="A3">A3</option>
                  <option value="A4">A4</option>
                  <option value="A5">A5</option>
                  <option value="A6">A6</option>
                  <option value="Letter">美式信纸</option>
                  <option value="Custom">自定义</option>
                </select>
              </label>

              <div className="dotlab-grid-2">
                <label>
                  宽度（{unit}）
                  <input
                    type="number"
                    min={unit === "mm" ? 50 : 190}
                    max={unit === "mm" ? 1200 : 4500}
                    value={displayNumber(pageWidthMm)}
                    onChange={(event) => {
                      setPaperPreset("Custom");
                      setPageWidthMm(clamp(readNumberAsMm(event.target.value), 50, 1200));
                    }}
                  />
                </label>
                <label>
                  高度（{unit}）
                  <input
                    type="number"
                    min={unit === "mm" ? 50 : 190}
                    max={unit === "mm" ? 1200 : 4500}
                    value={displayNumber(pageHeightMm)}
                    onChange={(event) => {
                      setPaperPreset("Custom");
                      setPageHeightMm(clamp(readNumberAsMm(event.target.value), 50, 1200));
                    }}
                  />
                </label>
              </div>

              <button type="button" className="dotlab-secondary" onClick={flipOrientation}>
                纵横互换
              </button>

              <h2>MARGINS</h2>

              <div className="dotlab-grid-2">
                <label>
                  上（{unit}）
                  <input
                    type="number"
                    min={0}
                    max={unit === "mm" ? 200 : 760}
                    value={displayNumber(marginTopMm)}
                    onChange={(event) => setMarginTopMm(clamp(readNumberAsMm(event.target.value), 0, 200))}
                  />
                </label>
                <label>
                  下（{unit}）
                  <input
                    type="number"
                    min={0}
                    max={unit === "mm" ? 200 : 760}
                    value={displayNumber(marginBottomMm)}
                    onChange={(event) => setMarginBottomMm(clamp(readNumberAsMm(event.target.value), 0, 200))}
                  />
                </label>
              </div>

              <div className="dotlab-grid-2">
                <label>
                  左（{unit}）
                  <input
                    type="number"
                    min={0}
                    max={unit === "mm" ? 200 : 760}
                    value={displayNumber(marginLeftMm)}
                    onChange={(event) => setMarginLeftMm(clamp(readNumberAsMm(event.target.value), 0, 200))}
                  />
                </label>
                <label>
                  右（{unit}）
                  <input
                    type="number"
                    min={0}
                    max={unit === "mm" ? 200 : 760}
                    value={displayNumber(marginRightMm)}
                    onChange={(event) => setMarginRightMm(clamp(readNumberAsMm(event.target.value), 0, 200))}
                  />
                </label>
              </div>

              <h2>PRESETS</h2>
              <div className="dotlab-preset-list" aria-label="风格预设">
                {STYLE_PRESETS.map((preset) => (
                  <button key={preset.name} type="button" className="dotlab-chip" onClick={() => applyStylePreset(preset)}>
                    {preset.name}
                  </button>
                ))}
              </div>

              <h2>EFFECTS</h2>

              <label>
                图案类型
                <select value={pattern} onChange={(event) => setPattern(event.target.value as PatternType)}>
                  {(Object.keys(PATTERN_LABELS) as PatternType[]).map((key) => (
                    <option key={key} value={key}>
                      {PATTERN_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="dotlab-grid-2">
                <label>
                  波点半径（{unit}）
                  <input
                    type="range"
                    min={mmToPx(0.3)}
                    max={mmToPx(12)}
                    step={1}
                    value={mmToPx(dotRadiusMm)}
                    onChange={(event) => setDotRadiusMm(clamp(pxToMm(Number(event.target.value)), 0.3, 12))}
                  />
                  <span>{formatValue(dotRadiusMm, unit)}</span>
                </label>
                <label>
                  横向间距（{unit}）
                  <input
                    type="range"
                    min={mmToPx(1.5)}
                    max={mmToPx(30)}
                    step={1}
                    value={mmToPx(gapXmm)}
                    onChange={(event) => setGapXmm(clamp(pxToMm(Number(event.target.value)), 1.5, 30))}
                  />
                  <span>{formatValue(gapXmm, unit)}</span>
                </label>
              </div>

              <div className="dotlab-grid-2">
                <label>
                  纵向间距（{unit}）
                  <input
                    type="range"
                    min={mmToPx(1.5)}
                    max={mmToPx(30)}
                    step={1}
                    value={mmToPx(gapYmm)}
                    onChange={(event) => setGapYmm(clamp(pxToMm(Number(event.target.value)), 1.5, 30))}
                  />
                  <span>{formatValue(gapYmm, unit)}</span>
                </label>
                <label>
                  随机扰动（{unit}）
                  <input
                    type="range"
                    min={0}
                    max={mmToPx(8)}
                    step={1}
                    value={mmToPx(jitterMm)}
                    onChange={(event) => setJitterMm(clamp(pxToMm(Number(event.target.value)), 0, 8))}
                  />
                  <span>{formatValue(jitterMm, unit)}</span>
                </label>
              </div>

              <div className="dotlab-grid-2">
                <label>
                  旋转角度
                  <input
                    type="range"
                    min={-45}
                    max={45}
                    step={1}
                    value={rotation}
                    onChange={(event) => setRotation(Number(event.target.value))}
                  />
                  <span>{rotation} 度</span>
                </label>
                <label>
                  缩放比例
                  <input
                    type="range"
                    min={60}
                    max={180}
                    step={1}
                    value={scale}
                    onChange={(event) => setScale(Number(event.target.value))}
                  />
                  <span>{scale}%</span>
                </label>
              </div>

              <label>
                随机种子
                <input
                  type="range"
                  min={1}
                  max={200}
                  step={1}
                  value={dotSeed}
                  onChange={(event) => setDotSeed(Number(event.target.value))}
                />
                <span>{dotSeed}</span>
              </label>

              <div className="dotlab-grid-2">
                <label>
                  背景颜色
                  <input type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} />
                </label>
                <label>
                  主色波点
                  <input type="color" value={dotColor} onChange={(event) => setDotColor(event.target.value)} />
                </label>
              </div>

              <label className="dotlab-checkbox">
                <input type="checkbox" checked={useAltColor} onChange={(event) => setUseAltColor(event.target.checked)} />
                启用副色交替
              </label>

              <label>
                副色波点
                <input
                  type="color"
                  value={altDotColor}
                  onChange={(event) => setAltDotColor(event.target.value)}
                  disabled={!useAltColor}
                />
              </label>

              <h2>OUTPUT</h2>
              <div className="dotlab-actions">
                <button type="button" onClick={exportDotPng}>
                  导出 PNG
                </button>
                <button type="button" onClick={exportDotSvg}>
                  导出 SVG
                </button>
              </div>
            </>
          )}

          {mode === "image" && (
            <>
              <h2>INPUT</h2>

              <label>
                上传图片
                <input type="file" accept="image/*" onChange={handleUpload} />
              </label>

              <h2>EFFECTS</h2>

              <label>
                风格类型
                <select value={effect} onChange={(event) => setEffect(event.target.value as EffectType)}>
                  <option value="pop">波普</option>
                  <option value="hot-noise">热噪点</option>
                  <option value="dot-matrix">点阵图案生成器</option>
                  <option value="ascii">ASCII码</option>
                  <option value="bayer">拜耳</option>
                </select>
              </label>

              <p className="dotlab-hint">{effectHint}</p>

              {effect === "pop" && (
                <>
                  <label>
                    配色组
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={1}
                      value={paletteIndex}
                      onChange={(event) => setPaletteIndex(Number(event.target.value))}
                    />
                    <span>#{paletteIndex + 1}</span>
                  </label>

                  <label>
                    色阶数量
                    <input
                      type="range"
                      min={2}
                      max={6}
                      step={1}
                      value={levels}
                      onChange={(event) => setLevels(Number(event.target.value))}
                    />
                    <span>{levels}</span>
                  </label>

                  <label>
                    对比强度
                    <input
                      type="range"
                      min={80}
                      max={200}
                      step={1}
                      value={Math.round(contrast * 100)}
                      onChange={(event) => setContrast(Number(event.target.value) / 100)}
                    />
                    <span>{Math.round(contrast * 100)}%</span>
                  </label>
                </>
              )}

              {effect === "hot-noise" && (
                <>
                  <label>
                    热度强度
                    <input
                      type="range"
                      min={60}
                      max={150}
                      step={1}
                      value={Math.round(heat * 100)}
                      onChange={(event) => setHeat(Number(event.target.value) / 100)}
                    />
                    <span>{Math.round(heat * 100)}%</span>
                  </label>

                  <label>
                    噪点颗粒
                    <input
                      type="range"
                      min={0}
                      max={60}
                      step={1}
                      value={Math.round(grain * 100)}
                      onChange={(event) => setGrain(Number(event.target.value) / 100)}
                    />
                    <span>{Math.round(grain * 100)}%</span>
                  </label>

                  <label>
                    随机种子
                    <input
                      type="range"
                      min={1}
                      max={200}
                      step={1}
                      value={imageSeed}
                      onChange={(event) => setImageSeed(Number(event.target.value))}
                    />
                    <span>{imageSeed}</span>
                  </label>
                </>
              )}

              {effect === "ascii" && (
                <>
                  <div className="dotlab-grid-2">
                    <label>
                      列数
                      <input
                        type="number"
                        min={12}
                        max={240}
                        value={asciiColumns}
                        onChange={(event) => setAsciiColumns(clamp(Number(event.target.value), 12, 240))}
                      />
                    </label>
                    <label>
                      行数
                      <input
                        type="number"
                        min={8}
                        max={160}
                        value={asciiRows}
                        onChange={(event) => setAsciiRows(clamp(Number(event.target.value), 8, 160))}
                      />
                    </label>
                  </div>

                  <label>
                    字符集
                    <input
                      type="text"
                      value={asciiCharset}
                      onChange={(event) => setAsciiCharset(event.target.value)}
                      placeholder=" .:-=+*#%@"
                    />
                  </label>

                  <label>
                    亮度
                    <input
                      type="range"
                      min={20}
                      max={250}
                      step={1}
                      value={Math.round(asciiBrightness * 100)}
                      onChange={(event) => setAsciiBrightness(clamp(Number(event.target.value) / 100, 0.2, 2.5))}
                    />
                    <span>{asciiBrightness.toFixed(2)}</span>
                  </label>

                  <label>
                    对比度
                    <input
                      type="range"
                      min={20}
                      max={300}
                      step={1}
                      value={Math.round(asciiContrast * 100)}
                      onChange={(event) => setAsciiContrast(clamp(Number(event.target.value) / 100, 0.2, 3))}
                    />
                    <span>{asciiContrast.toFixed(2)}</span>
                  </label>

                  <label className="dotlab-checkbox">
                    <input type="checkbox" checked={asciiInvert} onChange={(event) => setAsciiInvert(event.target.checked)} />
                    反相
                  </label>

                  <label className="dotlab-checkbox">
                    <input
                      type="checkbox"
                      checked={asciiUseImageColor}
                      onChange={(event) => setAsciiUseImageColor(event.target.checked)}
                    />
                    使用原始图片颜色
                  </label>

                  <div className="dotlab-grid-2">
                    <label>
                      背景颜色
                      <input
                        type="color"
                        value={asciiBackgroundColor}
                        onChange={(event) => setAsciiBackgroundColor(event.target.value)}
                      />
                    </label>
                    <label>
                      文字颜色
                      <input
                        type="color"
                        value={asciiForegroundColor}
                        onChange={(event) => setAsciiForegroundColor(event.target.value)}
                        disabled={asciiUseImageColor}
                      />
                    </label>
                  </div>
                </>
              )}

              {effect === "bayer" && (
                <>
                  <label>
                    预设矩阵
                    <div className="dotlab-preset-list" aria-label="拜耳预设">
                      <button type="button" className="dotlab-chip" onClick={() => applyBayerPreset("checker")}>
                        checker
                      </button>
                      <button type="button" className="dotlab-chip" onClick={() => applyBayerPreset("diagonals")}>
                        diagonals
                      </button>
                      <button type="button" className="dotlab-chip" onClick={() => applyBayerPreset("bayer2")}>
                        bayer2
                      </button>
                      <button type="button" className="dotlab-chip" onClick={() => applyBayerPreset("bayer4")}>
                        bayer4
                      </button>
                      <button type="button" className="dotlab-chip" onClick={() => applyBayerPreset("bayer8")}>
                        bayer8
                      </button>
                      <button type="button" className="dotlab-chip" onClick={() => applyBayerPreset("bayer16")}>
                        bayer16
                      </button>
                      <button type="button" className="dotlab-chip" onClick={() => applyBayerPreset("clear")}>
                        clear
                      </button>
                      <button type="button" className="dotlab-chip" onClick={randomizeBayerMatrix}>
                        random
                      </button>
                    </div>
                    <span>当前：{bayerPreset}</span>
                  </label>

                  <div className="dotlab-grid-2">
                    <label>
                      layer
                      <input
                        type="range"
                        min={0}
                        max={Math.max(0, bayerSteps - 1)}
                        step={1}
                        value={bayerEditLevel}
                        onChange={(event) => setBayerEditLevel(clamp(Number(event.target.value), 0, Math.max(0, bayerSteps - 1)))}
                      />
                      <span>{bayerEditLevel}</span>
                    </label>
                    <label>
                      steps
                      <input
                        type="number"
                        min={1}
                        max={32}
                        value={bayerSteps}
                        onChange={(event) => {
                          const nextSteps = clamp(Number(event.target.value), 1, 32);
                          setBayerSteps(nextSteps);
                          setBayerEditLevel((prev) => clamp(prev, 0, Math.max(0, nextSteps - 1)));
                        }}
                      />
                    </label>
                  </div>

                  <div className="dotlab-grid-2">
                    <label>
                      width
                      <input
                        type="number"
                        min={2}
                        max={32}
                        value={bayerWidth}
                        onChange={(event) => updateCustomBayerSize(Number(event.target.value), bayerHeight)}
                      />
                    </label>
                  </div>

                  <div className="dotlab-grid-2">
                    <label>
                      height
                      <input
                        type="number"
                        min={2}
                        max={32}
                        value={bayerHeight}
                        onChange={(event) => updateCustomBayerSize(bayerWidth, Number(event.target.value))}
                      />
                    </label>
                    <label>
                      pixel scale
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={bayerPixelScale}
                        onChange={(event) => setBayerPixelScale(clamp(Number(event.target.value), 1, 12))}
                      />
                    </label>
                  </div>

                  <div
                    className="dotlab-bayer-matrix"
                    style={{
                      gridTemplateColumns: `repeat(${bayerWidth}, minmax(0, 1fr))`,
                    }}
                    aria-label="阈值矩阵预览"
                    onContextMenu={(event) => event.preventDefault()}
                  >
                    {bayerThresholds.map((threshold, index) => {
                      const tone = Math.round(threshold * 255);
                      return (
                        <button
                          type="button"
                          key={`matrix-${index}`}
                          className="dotlab-bayer-cell"
                          onMouseDown={(event) => handleMatrixMouseDown(index, event)}
                          onMouseEnter={() => handleMatrixMouseEnter(index)}
                          onDragStart={(event) => event.preventDefault()}
                          onClick={() => setBayerCellThreshold(index)}
                          title={`阈值 ${threshold.toFixed(2)}`}
                          style={{ backgroundColor: `rgb(${tone}, ${tone}, ${tone})` }}
                        />
                      );
                    })}
                  </div>

                  <label className="dotlab-checkbox">
                    <input
                      type="checkbox"
                      checked={bayerGrayscale}
                      onChange={(event) => setBayerGrayscale(event.target.checked)}
                    />
                    grayscale
                  </label>

                  <label className="dotlab-checkbox">
                    <input type="checkbox" checked={bayerInvert} onChange={(event) => setBayerInvert(event.target.checked)} />
                    invert
                  </label>

                  <label>
                    brightness
                    <input
                      type="range"
                      min={20}
                      max={250}
                      step={1}
                      value={Math.round(bayerBrightness * 100)}
                      onChange={(event) => setBayerBrightness(clamp(Number(event.target.value) / 100, 0.2, 2.5))}
                    />
                    <span>{bayerBrightness.toFixed(2)}</span>
                  </label>

                  <label>
                    contrast
                    <input
                      type="range"
                      min={20}
                      max={300}
                      step={1}
                      value={Math.round(bayerContrast * 100)}
                      onChange={(event) => setBayerContrast(clamp(Number(event.target.value) / 100, 0.2, 3))}
                    />
                    <span>{bayerContrast.toFixed(2)}</span>
                  </label>
                </>
              )}

              {effect === "dot-matrix" && (
                <>
                  <label>
                    点大小：{dmPointSize.toFixed(1)}
                    <input
                      type="range"
                      min={0.2}
                      max={2.2}
                      step={0.1}
                      value={dmPointSize}
                      onChange={(event) => setDmPointSize(Number(event.target.value))}
                    />
                  </label>

                  <label>
                    点密度：{dmDensity}
                    <input
                      type="range"
                      min={4}
                      max={40}
                      step={1}
                      value={dmDensity}
                      onChange={(event) => setDmDensity(Number(event.target.value))}
                    />
                  </label>

                  <label>
                    椭圆拉伸：{dmStretch.toFixed(1)}
                    <input
                      type="range"
                      min={0.4}
                      max={2.4}
                      step={0.1}
                      value={dmStretch}
                      onChange={(event) => setDmStretch(Number(event.target.value))}
                    />
                  </label>

                  <label>
                    水平间距：{dmSpacingX.toFixed(1)}
                    <input
                      type="range"
                      min={0.4}
                      max={2.4}
                      step={0.1}
                      value={dmSpacingX}
                      onChange={(event) => setDmSpacingX(Number(event.target.value))}
                    />
                  </label>

                  <label>
                    垂直间距：{dmSpacingY.toFixed(1)}
                    <input
                      type="range"
                      min={0.4}
                      max={2.4}
                      step={0.1}
                      value={dmSpacingY}
                      onChange={(event) => setDmSpacingY(Number(event.target.value))}
                    />
                  </label>

                  <label>
                    区域大小：{dmRegionSize}
                    <input
                      type="range"
                      min={2}
                      max={24}
                      step={1}
                      value={dmRegionSize}
                      onChange={(event) => setDmRegionSize(Number(event.target.value))}
                    />
                  </label>

                  <div className="dotlab-grid-2">
                    <label>
                      背景颜色
                      <input
                        type="color"
                        value={dmBackgroundColor}
                        onChange={(event) => setDmBackgroundColor(event.target.value)}
                      />
                    </label>
                    <label>
                      点颜色
                      <input type="color" value={dmPointColor} onChange={(event) => setDmPointColor(event.target.value)} />
                    </label>
                  </div>

                  <label className="dotlab-checkbox">
                    <input
                      type="checkbox"
                      checked={dmUseImageColor}
                      onChange={(event) => setDmUseImageColor(event.target.checked)}
                    />
                    使用原始图片颜色
                  </label>
                </>
              )}

              <h2>OUTPUT</h2>
              <div className="dotlab-actions">
                <button type="button" onClick={exportImagePng} disabled={!imageSrc}>
                  导出 PNG
                </button>
              </div>
            </>
          )}
        </section>

        {mode === "studio" && (
          <section className="dotlab-preview-wrap" aria-label="加工站预览区">
            <div className="dotlab-preview-scroll" aria-label="画布滚动区域">
              <div className="dotlab-preview-board" style={{ display: 'flex', justifyContent: 'center' }}>
                <div dangerouslySetInnerHTML={{ __html: studioSvgMarkup }} />
              </div>
            </div>
          </section>
        )}

        {mode === "dot" && (
          <section className="dotlab-preview-wrap" aria-label="图案预览区">
            <div className="dotlab-preview-scroll" aria-label="画布滚动区域">
              <div className="dotlab-preview-board">
                <svg
                  viewBox={`0 0 ${pageWidthPx} ${pageHeightPx}`}
                  width={pageWidthPx}
                  height={pageHeightPx}
                  role="img"
                  aria-label="波点图案预览"
                >
                  <rect width="100%" height="100%" fill={backgroundColor} />
                  <rect
                    x={safeBounds.x}
                    y={safeBounds.y}
                    width={safeBounds.width}
                    height={safeBounds.height}
                    fill="none"
                    stroke="#1f242766"
                    strokeDasharray="8 8"
                    strokeWidth={1.2}
                  />
                  <defs>
                    <clipPath id="preview-safe-area">
                      <rect x={safeBounds.x} y={safeBounds.y} width={safeBounds.width} height={safeBounds.height} />
                    </clipPath>
                  </defs>
                  <g transform={patternTransform} clipPath="url(#preview-safe-area)">
                    {dots.map((dot, index) => (
                      <circle key={`${dot.x}-${dot.y}-${index}`} cx={dot.x} cy={dot.y} r={dot.r} fill={dot.color} />
                    ))}
                  </g>
                </svg>
              </div>
            </div>
          </section>
        )}

        {mode === "image" && (
          <section className="dotlab-preview-wrap" aria-label="图片预览区">
            <div className="dotlab-preview-scroll" aria-label="画布滚动区域">
              <div className="dotlab-preview-board dotlab-preview-image-board">
                {!imageSrc && <p className="dotlab-empty">请先上传一张图片开始编辑</p>}
                <canvas ref={canvasRef} className={imageSrc ? "dotlab-canvas" : "dotlab-canvas hidden"} />
              </div>
            </div>
            {imageInfo && (
              <p className="dotlab-meta">
                输出尺寸：{imageInfo.width} × {imageInfo.height} 像素
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

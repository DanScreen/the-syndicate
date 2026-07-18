import { BRAND_COLORS } from "@tiki-acca/shared";

export type ShareChartPoint = {
  cumulativePoints: number;
};

export type ShareImageInput = {
  title: string;
  subtitle?: string;
  netPoints: number;
  legsPlayed: number;
  winRate: number | null;
  chart?: ShareChartPoint[];
};

const WIDTH = 1080;
const HEIGHT = 1080;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Triangle rondo disc mark — mirrors `app/icon.svg` geometry (viewBox 220). */
function drawLogoMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const scale = size / 220;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Disc
  ctx.beginPath();
  ctx.arc(110, 110, 106, 0, Math.PI * 2);
  ctx.fillStyle = BRAND_COLORS.accentMuted;
  ctx.fill();

  // Passes: white line + explicit chevron head. Coordinates are the
  // inverted (apex-down) cut, reflected vertically about y=110 — matches
  // lib/brand/rondo-icon.tsx.
  const passes: {
    line: [number, number, number, number];
    chevron: [number, number, number, number, number, number];
  }[] = [
    { line: [120.25, 144.25, 139.28, 111.28], chevron: [133.33, 107.79, 145.28, 100.89, 145.28, 114.69] },
    { line: [134.53, 84, 96.47, 84], chevron: [96.42, 90.9, 84.47, 84, 96.42, 77.1] },
    { line: [75.22, 101.75, 94.25, 134.72], chevron: [100.25, 131.31, 100.25, 145.11, 88.3, 138.21] },
  ];
  ctx.strokeStyle = BRAND_COLORS.foreground;
  ctx.lineWidth = 10;
  for (const p of passes) {
    ctx.beginPath();
    ctx.moveTo(p.line[0], p.line[1]);
    ctx.lineTo(p.line[2], p.line[3]);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.chevron[0], p.chevron[1]);
    ctx.lineTo(p.chevron[2], p.chevron[3]);
    ctx.lineTo(p.chevron[4], p.chevron[5]);
    ctx.stroke();
  }

  // Triangle players (white)
  const dots: [number, number][] = [
    [110, 162],
    [155.03, 84],
    [64.97, 84],
  ];
  ctx.fillStyle = BRAND_COLORS.foreground;
  for (const [dx, dy] of dots) {
    ctx.beginPath();
    ctx.arc(dx, dy, 14.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Centre player being passed around (green)
  ctx.beginPath();
  ctx.arc(110, 110, 13.5, 0, Math.PI * 2);
  ctx.fillStyle = BRAND_COLORS.accent;
  ctx.fill();

  ctx.restore();
}

function drawSparkline(
  ctx: CanvasRenderingContext2D,
  points: ShareChartPoint[],
  x: number,
  y: number,
  width: number,
  height: number
) {
  if (points.length < 2) return;

  const values = points.map((p) => p.cumulativePoints);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;

  ctx.strokeStyle = BRAND_COLORS.accent;
  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();

  points.forEach((point, i) => {
    const px = x + (i / (points.length - 1)) * width;
    const py = y + height - ((point.cumulativePoints - min) / range) * height;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  const last = values[values.length - 1]!;
  const lastX = x + width;
  const lastY = y + height - ((last - min) / range) * height;
  ctx.fillStyle = BRAND_COLORS.accent;
  ctx.beginPath();
  ctx.arc(lastX, lastY, 8, 0, Math.PI * 2);
  ctx.fill();
}

async function loadFonts() {
  await Promise.all([
    document.fonts.load('700 56px "Outfit"'),
    document.fonts.load('800 128px "Outfit"'),
    document.fonts.load('600 24px "Outfit"'),
    document.fonts.load('500 28px system-ui'),
  ]).catch(() => undefined);
}

export async function renderPerformanceShareImage(
  input: ShareImageInput
): Promise<Blob> {
  await loadFonts();

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, BRAND_COLORS.background);
  bg.addColorStop(1, BRAND_COLORS.card);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "rgba(34, 197, 94, 0.1)";
  ctx.beginPath();
  ctx.arc(WIDTH * 0.82, HEIGHT * 0.12, 320, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(34, 197, 94, 0.22)";
  ctx.lineWidth = 3;
  roundRect(ctx, 48, 48, WIDTH - 96, HEIGHT - 96, 28);
  ctx.stroke();

  drawLogoMark(ctx, 96, 96, 72);

  ctx.fillStyle = BRAND_COLORS.muted;
  ctx.font = '600 24px "Outfit", system-ui, sans-serif';
  ctx.textAlign = "left";
  ctx.fillText("TIKI ACCA", 188, 132);

  ctx.fillStyle = BRAND_COLORS.foreground;
  ctx.font = '700 52px "Outfit", system-ui, sans-serif';
  const titleLines = wrapText(ctx, input.title, WIDTH - 192, 2);
  titleLines.forEach((line, i) => {
    ctx.fillText(line, 96, 220 + i * 62);
  });

  if (input.subtitle) {
    ctx.fillStyle = BRAND_COLORS.muted;
    ctx.font = "500 30px system-ui, sans-serif";
    ctx.fillText(input.subtitle, 96, 220 + titleLines.length * 62 + 16);
  }

  const pointsY = input.subtitle ? 380 : 340;
  const pointsPrefix = input.netPoints > 0 ? "+" : "";
  const pointsColor =
    input.netPoints > 0
      ? BRAND_COLORS.accent
      : input.netPoints < 0
        ? BRAND_COLORS.danger
        : BRAND_COLORS.foreground;

  ctx.fillStyle = BRAND_COLORS.muted;
  ctx.font = '600 26px "Outfit", system-ui, sans-serif';
  ctx.fillText("NET POINTS", 96, pointsY);

  ctx.fillStyle = pointsColor;
  ctx.font = '800 128px "Outfit", system-ui, sans-serif';
  ctx.fillText(`${pointsPrefix}${input.netPoints.toFixed(2)}`, 96, pointsY + 120);

  const statsY = pointsY + 200;
  drawStatBlock(ctx, 96, statsY, "Legs played", String(input.legsPlayed));
  if (input.winRate != null) {
    drawStatBlock(ctx, 420, statsY, "Win rate", `${input.winRate}%`);
  }

  if (input.chart && input.chart.length > 1) {
    const chartY = statsY + 140;
    ctx.fillStyle = BRAND_COLORS.muted;
    ctx.font = '600 22px "Outfit", system-ui, sans-serif';
    ctx.fillText("PERFORMANCE TREND", 96, chartY);

    roundRect(ctx, 96, chartY + 24, WIDTH - 192, 200, 16);
    ctx.fillStyle = "rgba(17, 24, 39, 0.85)";
    ctx.fill();
    ctx.strokeStyle = BRAND_COLORS.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    drawSparkline(ctx, input.chart, 120, chartY + 48, WIDTH - 240, 152);
  }

  ctx.fillStyle = BRAND_COLORS.accent;
  ctx.font = '600 30px "Outfit", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("www.tikiacca.com", WIDTH / 2, HEIGHT - 96);

  ctx.fillStyle = BRAND_COLORS.muted;
  ctx.font = "500 22px system-ui, sans-serif";
  ctx.fillText("Social group accas", WIDTH / 2, HEIGHT - 58);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to create image"))),
      "image/png",
      1
    );
  });
}

function drawStatBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  value: string
) {
  roundRect(ctx, x, y, 280, 110, 14);
  ctx.fillStyle = "rgba(17, 24, 39, 0.9)";
  ctx.fill();
  ctx.strokeStyle = BRAND_COLORS.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = BRAND_COLORS.muted;
  ctx.font = "500 24px system-ui, sans-serif";
  ctx.fillText(label, x + 24, y + 40);

  ctx.fillStyle = BRAND_COLORS.foreground;
  ctx.font = '700 44px "Outfit", system-ui, sans-serif';
  ctx.fillText(value, x + 24, y + 88);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = test;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.length > 0 ? lines : [text];
}

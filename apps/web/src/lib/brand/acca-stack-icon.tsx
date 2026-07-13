/** Acca stack mark for favicon / app icon ImageResponse (matches logo.tsx). */
export function AccaStackMark({
  size,
  background = "#0b1220",
}: {
  size: number;
  background?: string;
}) {
  const markSize = Math.round(size * 0.82);
  const scale = markSize / 40;

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background,
      }}
    >
      <div
        style={{
          width: 40 * scale,
          height: 40 * scale,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          background: "rgba(20, 83, 45, 0.95)",
          borderRadius: 10 * scale,
          paddingTop: 11 * scale,
          paddingLeft: 10 * scale,
          gap: 3 * scale,
        }}
      >
        <div
          style={{
            width: 20 * scale,
            height: 4 * scale,
            background: "#22c55e",
            borderRadius: 2 * scale,
          }}
        />
        <div
          style={{
            width: 16 * scale,
            height: 4 * scale,
            background: "rgba(34, 197, 94, 0.8)",
            borderRadius: 2 * scale,
          }}
        />
        <div
          style={{
            width: 12 * scale,
            height: 4 * scale,
            background: "rgba(34, 197, 94, 0.55)",
            borderRadius: 2 * scale,
          }}
        />
      </div>
    </div>
  );
}

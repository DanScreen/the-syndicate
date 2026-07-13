/** Acca stack mark for favicon / app icon ImageResponse (matches logo.tsx). */
export function AccaStackMark({
  size,
  background = "transparent",
}: {
  size: number;
  background?: string;
}) {
  const scale = size / 40;

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
          width: size,
          height: size,
          position: "relative",
          display: "flex",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 40 * scale,
            height: 40 * scale,
            background: "rgba(20, 83, 45, 0.6)",
            borderRadius: 10 * scale,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 10 * scale,
            top: 11 * scale,
            width: 20 * scale,
            height: 4 * scale,
            background: "#22c55e",
            borderRadius: 1.5 * scale,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 10 * scale,
            top: 18 * scale,
            width: 16 * scale,
            height: 4 * scale,
            background: "rgba(34, 197, 94, 0.8)",
            borderRadius: 1.5 * scale,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 10 * scale,
            top: 25 * scale,
            width: 12 * scale,
            height: 4 * scale,
            background: "rgba(34, 197, 94, 0.55)",
            borderRadius: 1.5 * scale,
          }}
        />
      </div>
    </div>
  );
}

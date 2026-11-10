import { scrollStory } from "@/lib/marketing-content";
import { MateAvatar } from "./mate-avatar";

const mates = [
  { name: "Danny", color: "#a78bfa", filled: true },
  { name: "Sarah", color: "#f472b6", filled: true },
  { name: "Matty", color: "#fb923c", filled: true },
  { name: "Priya", color: "#2dd4bf", filled: false },
  { name: "Tom", color: "#818cf8", filled: false },
] as const;

const bookmakers = [
  { name: "Bookmaker A", odds: "8.93", best: true },
  { name: "Bookmaker B", odds: "8.60", best: false },
  { name: "Bookmaker C", odds: "8.41", best: false },
] as const;

const leaderboard = [
  { name: "Sarah", color: "#f472b6", points: 42, form: [true, true, true, false, true], tag: "Banker" },
  { name: "Danny", color: "#a78bfa", points: 31, form: [true, false, true, true, false], tag: null },
  { name: "Tom", color: "#818cf8", points: 12, form: [false, false, true, false, false], tag: "Acca killer" },
] as const;

function PicksMock() {
  return (
    <div>
      <div className="flex items-center justify-center gap-3">
        {mates.map((mate) =>
          mate.filled ? (
            <MateAvatar key={mate.name} name={mate.name} color={mate.color} />
          ) : (
            <span
              key={mate.name}
              aria-hidden="true"
              className="h-10 w-10 shrink-0 rounded-full border-2 border-dashed border-muted/60"
            />
          ),
        )}
      </div>
      <p className="mt-6 text-center text-sm text-muted">Waiting on Priya and Tom</p>
    </div>
  );
}

function OddsMock() {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted">Where it pays best · Example odds</p>
      <ul className="mt-4 flex flex-col gap-2">
        {bookmakers.map((book) => (
          <li
            key={book.name}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
              book.best ? "border-accent bg-accent-muted/30" : "border-border bg-background/60"
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              {book.name}
              {book.best && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-accent">
                  Best
                </span>
              )}
            </span>
            <span className="font-semibold tabular-nums text-accent">{book.odds}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LeaderboardMock() {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted">Leaderboard · Example</p>
      <ul className="mt-4 flex flex-col gap-2">
        {leaderboard.map((row) => (
          <li
            key={row.name}
            className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3 py-2.5"
          >
            <MateAvatar name={row.name} color={row.color} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{row.name}</p>
                {row.tag && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      row.tag === "Banker"
                        ? "bg-accent text-on-accent"
                        : "border border-border text-muted"
                    }`}
                  >
                    {row.tag}
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex gap-1" aria-label="Last five legs">
                {row.form.map((won, index) => (
                  <span
                    key={index}
                    className={`h-2 w-2 rounded-full ${won ? "bg-success" : "bg-danger"}`}
                  />
                ))}
              </div>
            </div>
            <span className="shrink-0 text-sm font-bold tabular-nums">{row.points} pts</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const mocks = [PicksMock, OddsMock, LeaderboardMock] as const;

export function ScrollStory() {
  return (
    <section className="mx-auto max-w-6xl space-y-20 px-4 py-20 md:space-y-28">
      {scrollStory.map((item, index) => {
        const Mock = mocks[index];
        return (
          <div
            key={item.title}
            className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
          >
            <div className={index % 2 === 1 ? "lg:order-last" : undefined}>
              <span className="font-display text-4xl font-bold text-accent">{item.step}</span>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
                {item.title}
              </h2>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-muted">{item.body}</p>
            </div>
            <div
              className={`glass-card rounded-2xl border border-border p-6 shadow-xl shadow-black/30 md:p-8 ${
                index % 2 === 1 ? "lg:order-first" : ""
              }`}
            >
              <Mock />
            </div>
          </div>
        );
      })}
    </section>
  );
}

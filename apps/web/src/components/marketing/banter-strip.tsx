import { banterLines } from "@/lib/marketing-content";

export function BanterStrip() {
  return (
    <section className="border-y border-border bg-card/30">
      <div className="mx-auto max-w-3xl px-4 py-20">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Example group chat</p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
          Bragging rights, kept on record.
        </h2>
        <ul className="mt-10 flex flex-col gap-4">
          {banterLines.map((line, index) => (
            <li key={line} className={`flex ${index % 2 === 1 ? "justify-end" : "justify-start"}`}>
              <p
                className={`max-w-[85%] rounded-2xl border border-border bg-card px-4 py-3 text-sm leading-relaxed ${
                  index % 2 === 1 ? "rounded-tr-sm" : "rounded-tl-sm"
                }`}
              >
                {line}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

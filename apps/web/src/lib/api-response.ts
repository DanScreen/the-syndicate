/**
 * The shape a value takes on the wire after `NextResponse.json()`: Dates become
 * ISO strings, and functions are dropped.
 */
export type Serialized<T> = T extends Date
  ? string
  : T extends (...args: never[]) => unknown
    ? never
    : T extends readonly (infer U)[]
      ? Serialized<U>[]
      : T extends object
        ? { [K in keyof T]: Serialized<T[K]> }
        : T;

/**
 * Type-only marker for response bodies. Use as
 * `NextResponse.json(serialized(body) satisfies GroupDetailResponse)` so the
 * compiler checks the route's real output against the shared contract in
 * `@tiki-acca/shared` that the web and mobile clients read.
 */
export function serialized<T>(body: T): Serialized<T> {
  return body as Serialized<T>;
}

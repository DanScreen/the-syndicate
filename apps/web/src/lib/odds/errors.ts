export type OddsApiErrorBody = {
  message?: string;
  error_code?: string;
};

export class OddsApiError extends Error {
  readonly status: number;
  readonly errorCode: string | null;
  readonly body: string;

  constructor(status: number, body: string) {
    const parsed = parseOddsApiErrorBody(body);
    super(`The Odds API error ${status}: ${body}`);
    this.name = "OddsApiError";
    this.status = status;
    this.body = body;
    this.errorCode = parsed.error_code ?? null;
  }
}

export class OddsApiQuotaExhaustedError extends OddsApiError {
  constructor(status: number, body: string) {
    super(status, body);
    this.name = "OddsApiQuotaExhaustedError";
  }
}

function parseOddsApiErrorBody(body: string): OddsApiErrorBody {
  try {
    return JSON.parse(body) as OddsApiErrorBody;
  } catch {
    return {};
  }
}

export function isQuotaExhaustedError(err: unknown): boolean {
  if (err instanceof OddsApiQuotaExhaustedError) return true;
  if (err instanceof OddsApiError) {
    return err.errorCode === "OUT_OF_USAGE_CREDITS";
  }
  if (err instanceof Error) {
    return err.message.includes("OUT_OF_USAGE_CREDITS");
  }
  return false;
}

export function toOddsApiError(status: number, body: string): OddsApiError {
  const parsed = parseOddsApiErrorBody(body);
  if (parsed.error_code === "OUT_OF_USAGE_CREDITS") {
    return new OddsApiQuotaExhaustedError(status, body);
  }
  return new OddsApiError(status, body);
}

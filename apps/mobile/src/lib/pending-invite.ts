const PENDING_KEY = "pending_invite_code";

let memoryCode: string | null = null;

export function setPendingInviteCode(code: string) {
  memoryCode = code.trim().toUpperCase();
}

export function peekPendingInviteCode(): string | null {
  return memoryCode;
}

export function consumePendingInviteCode(): string | null {
  const code = memoryCode;
  memoryCode = null;
  return code;
}

export { PENDING_KEY };

// Simple invite code generator without external deps
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

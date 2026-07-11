import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createGroupSchema = z.object({
  name: z.string().min(3).max(60),
});

export const joinGroupSchema = z.object({
  inviteCode: z.string().min(6).max(12),
});

export const submitLegSchema = z.object({
  roundId: z.string(),
  competitionId: z.string(),
  fixtureId: z.string(),
  marketType: z.string(),
  selectionId: z.string(),
});

export const settleRoundSchema = z.object({
  roundId: z.string(),
  legOutcomes: z.array(
    z.object({
      legId: z.string(),
      outcome: z.enum(["won", "lost", "void"]),
    })
  ),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type JoinGroupInput = z.infer<typeof joinGroupSchema>;
export type SubmitLegInput = z.infer<typeof submitLegSchema>;

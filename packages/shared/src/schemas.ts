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

/** Editing an existing leg — same pick shape as submit; the leg id comes from the URL. */
export const editLegSchema = submitLegSchema.omit({ roundId: true });

export const updateCompetitionSettingSchema = z.object({
  competitionId: z.string(),
  enabled: z.boolean(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type JoinGroupInput = z.infer<typeof joinGroupSchema>;
export type SubmitLegInput = z.infer<typeof submitLegSchema>;
export type EditLegInput = z.infer<typeof editLegSchema>;

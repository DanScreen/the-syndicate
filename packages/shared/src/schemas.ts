import { z } from "zod";
import { DEFAULT_LEGS_PER_MEMBER, LEGS_PER_MEMBER_OPTIONS } from "./constants";
import { containsProfanity } from "./profanity";
import { isValidDateOfBirth, meetsMinimumAge, MIN_SIGN_UP_AGE } from "./age";

export const signUpSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .refine((v) => !containsProfanity(v), {
      message: "Please choose a different first name",
    }),
  lastName: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .refine((v) => !containsProfanity(v), {
      message: "Please choose a different last name",
    }),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  // `YYYY-MM-DD` as produced by an HTML date input. Must be a real date and 18+.
  dateOfBirth: z
    .string()
    .refine(isValidDateOfBirth, { message: "Enter a valid date of birth" })
    .refine((v) => meetsMinimumAge(v), {
      message: `You must be at least ${MIN_SIGN_UP_AGE} to sign up`,
    }),
});

/** Full display name stored on User.name for groups, emails, and leaderboards. */
export function formatDisplayName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, " ").trim();
}

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const legsPerMemberSchema = z
  .number()
  .int()
  .refine(
    (n): n is (typeof LEGS_PER_MEMBER_OPTIONS)[number] =>
      (LEGS_PER_MEMBER_OPTIONS as readonly number[]).includes(n),
    { message: "legsPerMember must be 1, 2, or 3" }
  );

export const createGroupSchema = z.object({
  name: z
    .string()
    .min(3)
    .max(60)
    .refine((v) => !containsProfanity(v), {
      message: "Please choose a different group name",
    }),
  legsPerMember: legsPerMemberSchema.optional().default(DEFAULT_LEGS_PER_MEMBER),
});

export const updateGroupSettingsSchema = z.object({
  legsPerMember: legsPerMemberSchema,
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

/** Platform-admin manual settlement — outcomes must cover every leg in the round. */
export const adminSettleRoundSchema = z.object({
  legOutcomes: z
    .array(
      z.object({
        legId: z.string(),
        outcome: z.enum(["won", "lost", "void"]),
      })
    )
    .min(1),
});

export const pushTokenSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(["ios", "android"]),
});

export const deletePushTokenSchema = z.object({
  token: z.string().min(10).optional(),
});

export const notificationPreferencesSchema = z.object({
  emailPickReminder: z.boolean().optional(),
  emailRoundLocked: z.boolean().optional(),
  emailRoundSettled: z.boolean().optional(),
  pushPickReminder: z.boolean().optional(),
  pushRoundLocked: z.boolean().optional(),
  pushRoundSettled: z.boolean().optional(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupSettingsInput = z.infer<typeof updateGroupSettingsSchema>;
export type JoinGroupInput = z.infer<typeof joinGroupSchema>;
export type SubmitLegInput = z.infer<typeof submitLegSchema>;
export type EditLegInput = z.infer<typeof editLegSchema>;

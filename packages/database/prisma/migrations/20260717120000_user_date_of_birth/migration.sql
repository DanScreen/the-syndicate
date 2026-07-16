-- Capture date of birth at sign-up for 18+ age verification.
--
-- Nullable so existing accounts (created before this column existed) remain
-- valid and are grandfathered in; all new sign-ups are required by the app to
-- provide a date of birth and must be at least 18 (enforced in signUpSchema).
ALTER TABLE "User" ADD COLUMN "dateOfBirth" DATE;

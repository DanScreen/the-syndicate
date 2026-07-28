-- Solo accas: rounds opened in a one-member group allow up to SOLO_MAX_LEGS
-- legs from that member and can be locked manually.
ALTER TABLE "Round" ADD COLUMN "unlimitedLegs" BOOLEAN NOT NULL DEFAULT false;

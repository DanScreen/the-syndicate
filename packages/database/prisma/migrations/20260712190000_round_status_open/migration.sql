-- Rename round status collecting → open (Bet Open / Bet Locked / Bet Settled UX).
UPDATE "Round" SET status = 'open' WHERE status = 'collecting';
UPDATE "Group" SET status = 'open' WHERE status = 'collecting';

ALTER TABLE "Round" ALTER COLUMN "status" SET DEFAULT 'open';

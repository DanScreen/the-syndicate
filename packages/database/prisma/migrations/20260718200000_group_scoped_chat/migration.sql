-- Give every existing message durable group ownership before making round
-- context optional. This preserves the complete history when bets settle.
ALTER TABLE "RoundMessage" ADD COLUMN "groupId" TEXT;

UPDATE "RoundMessage" AS message
SET "groupId" = round."groupId"
FROM "Round" AS round
WHERE message."roundId" = round."id";

-- Rolling-deploy compatibility: an older app revision still writes only
-- roundId. Fill groupId before the new NOT NULL constraint is checked.
CREATE OR REPLACE FUNCTION "set_round_message_group_id"()
RETURNS TRIGGER AS $$
DECLARE
  round_group_id TEXT;
BEGIN
  IF NEW."roundId" IS NOT NULL THEN
    SELECT "groupId" INTO round_group_id
    FROM "Round"
    WHERE "id" = NEW."roundId";

    IF round_group_id IS NULL THEN
      RAISE EXCEPTION 'RoundMessage round % does not exist', NEW."roundId"
        USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF NEW."groupId" IS NULL THEN
      NEW."groupId" := round_group_id;
    ELSIF NEW."groupId" <> round_group_id THEN
      RAISE EXCEPTION 'RoundMessage group % does not match round group %',
        NEW."groupId", round_group_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "RoundMessage_set_group_id"
BEFORE INSERT OR UPDATE OF "groupId", "roundId" ON "RoundMessage"
FOR EACH ROW
EXECUTE FUNCTION "set_round_message_group_id"();

ALTER TABLE "RoundMessage" ALTER COLUMN "groupId" SET NOT NULL;
ALTER TABLE "RoundMessage" ALTER COLUMN "roundId" DROP NOT NULL;

ALTER TABLE "RoundMessage"
  DROP CONSTRAINT "RoundMessage_roundId_fkey";

ALTER TABLE "RoundMessage"
  ADD CONSTRAINT "RoundMessage_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoundMessage"
  ADD CONSTRAINT "RoundMessage_roundId_fkey"
  FOREIGN KEY ("roundId") REFERENCES "Round"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "RoundMessage_groupId_createdAt_idx"
  ON "RoundMessage"("groupId", "createdAt");

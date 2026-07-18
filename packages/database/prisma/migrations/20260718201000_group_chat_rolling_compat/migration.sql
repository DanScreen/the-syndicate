-- Idempotently ensure rolling-deploy compatibility for databases where the
-- preceding migration was applied during development before its trigger was
-- added. Fresh deployments already have the same function and trigger.
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

DROP TRIGGER IF EXISTS "RoundMessage_set_group_id" ON "RoundMessage";

CREATE TRIGGER "RoundMessage_set_group_id"
BEFORE INSERT OR UPDATE OF "groupId", "roundId" ON "RoundMessage"
FOR EACH ROW
EXECUTE FUNCTION "set_round_message_group_id"();

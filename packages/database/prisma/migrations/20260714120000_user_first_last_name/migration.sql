-- Split User.name into firstName / lastName; keep name as full display name.
ALTER TABLE "User" ADD COLUMN "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN "lastName" TEXT;

UPDATE "User"
SET
  "firstName" = CASE
    WHEN position(' ' IN trim(both FROM "name")) > 0
      THEN left(trim(both FROM "name"), position(' ' IN trim(both FROM "name")) - 1)
    ELSE trim(both FROM "name")
  END,
  "lastName" = CASE
    WHEN position(' ' IN trim(both FROM "name")) > 0
      THEN trim(both FROM substring(trim(both FROM "name") FROM position(' ' IN trim(both FROM "name")) + 1))
    ELSE ''
  END;

ALTER TABLE "User" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "lastName" SET NOT NULL;

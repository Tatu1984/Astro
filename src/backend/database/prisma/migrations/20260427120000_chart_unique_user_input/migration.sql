-- Drop the old (profileId-based) unique constraint and replace with a
-- (userId, kind, system, houseSystem, inputHash) constraint. The same
-- compute output now collides on userId regardless of which profile the
-- request named, so identical math returns the cached row.

-- DropIndex
DROP INDEX IF EXISTS "Chart_profileId_kind_system_houseSystem_divisionalIx_inputH_key";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Chart_userId_kind_system_houseSystem_inputHash_key"
  ON "Chart"("userId", "kind", "system", "houseSystem", "inputHash");

/*
  Warnings:

  - You are about to drop the column `athleteProfileId` on the `deals` table. All the data in the column will be lost.
  - Added the required column `athleteId` to the `deals` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "deals" DROP CONSTRAINT "deals_athleteProfileId_fkey";

-- AlterTable
ALTER TABLE "deals" DROP COLUMN "athleteProfileId",
ADD COLUMN     "athleteId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athlete_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

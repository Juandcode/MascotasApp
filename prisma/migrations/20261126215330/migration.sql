/*
  Warnings:

  - The `state` column on the `pet_lost` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PetStatus" AS ENUM ('LOST', 'FOUND');

-- AlterTable
ALTER TABLE "pet_lost" DROP COLUMN "state",
ADD COLUMN     "state" "PetStatus" NOT NULL DEFAULT 'LOST';

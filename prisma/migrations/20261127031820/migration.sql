/*
  Warnings:

  - You are about to drop the column `userId` on the `pet_lost` table. All the data in the column will be lost.
  - Added the required column `user_id` to the `pet_lost` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "pet_lost" DROP CONSTRAINT "pet_lost_userId_fkey";

-- AlterTable
ALTER TABLE "pet_lost" DROP COLUMN "userId",
ADD COLUMN     "user_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "pet_lost" ADD CONSTRAINT "pet_lost_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

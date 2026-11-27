/*
  Warnings:

  - Added the required column `key` to the `photopet_lost` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "photopet_lost" ADD COLUMN     "key" TEXT NOT NULL;

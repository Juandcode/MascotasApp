/*
  Warnings:

  - You are about to drop the `Pet` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
CREATE EXTENSION IF NOT EXISTS vector;
-- DropForeignKey
ALTER TABLE "Pet" DROP CONSTRAINT "Pet_userId_fkey";

-- DropTable
DROP TABLE "Pet";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_lost" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "color" TEXT,
    "race" TEXT,
    "state" TEXT NOT NULL DEFAULT 'perdido',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "pet_lost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photopet_lost" (
    "id" TEXT NOT NULL,
    "pet_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "embedding" vector(768),

    CONSTRAINT "photopet_lost_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "pet_lost" ADD CONSTRAINT "pet_lost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photopet_lost" ADD CONSTRAINT "photopet_lost_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pet_lost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

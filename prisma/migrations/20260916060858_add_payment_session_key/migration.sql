/*
  Warnings:

  - A unique constraint covering the columns `[session_key]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "session_key" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "payments_session_key_key" ON "payments"("session_key");

-- CreateEnum
CREATE TYPE "OperatorApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OperatorInvitationStatus" AS ENUM ('PENDING', 'USED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "operator_applications" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "operator_type" "OperatorType" NOT NULL,
    "license_number" VARCHAR(100),
    "employee_code" VARCHAR(100),
    "hospital_id" UUID,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "OperatorApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "reviewed_by" UUID,
    "reviewedAt" TIMESTAMP(3),
    "user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operator_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operator_invitations" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" "OperatorInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "operator_type" "OperatorType" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "license_number" VARCHAR(100),
    "employee_code" VARCHAR(100),
    "hospital_id" UUID,
    "invited_by" UUID NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operator_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operator_applications_email_key" ON "operator_applications"("email");

-- CreateIndex
CREATE UNIQUE INDEX "operator_applications_phone_key" ON "operator_applications"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "operator_applications_user_id_key" ON "operator_applications"("user_id");

-- CreateIndex
CREATE INDEX "operator_applications_status_idx" ON "operator_applications"("status");

-- CreateIndex
CREATE INDEX "operator_applications_operator_type_idx" ON "operator_applications"("operator_type");

-- CreateIndex
CREATE INDEX "operator_applications_reviewed_by_idx" ON "operator_applications"("reviewed_by");

-- CreateIndex
CREATE UNIQUE INDEX "operator_invitations_token_hash_key" ON "operator_invitations"("token_hash");

-- CreateIndex
CREATE INDEX "operator_invitations_email_idx" ON "operator_invitations"("email");

-- CreateIndex
CREATE INDEX "operator_invitations_status_expires_at_idx" ON "operator_invitations"("status", "expires_at");

-- CreateIndex
CREATE INDEX "operator_invitations_invited_by_idx" ON "operator_invitations"("invited_by");

-- AddForeignKey
ALTER TABLE "operator_applications" ADD CONSTRAINT "operator_applications_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_applications" ADD CONSTRAINT "operator_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_applications" ADD CONSTRAINT "operator_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_invitations" ADD CONSTRAINT "operator_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_invitations" ADD CONSTRAINT "operator_invitations_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

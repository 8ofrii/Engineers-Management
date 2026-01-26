/*
  Warnings:

  - The values [PENDING,COMPLETED] on the enum `TransactionStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `paymentTerms` on the `clients` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RevenueModel" AS ENUM ('DESIGN_ONLY_AREA', 'EXECUTION_COST_PLUS', 'EXECUTION_LUMP_SUM');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('AVAILABLE', 'PARTIALLY_USED', 'CONSUMED');

-- CreateEnum
CREATE TYPE "CustodyTransferType" AS ENUM ('FUNDING', 'CLEARANCE', 'RETURN');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ACTION_REQUIRED', 'INFO', 'ALERT');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'CUSTODY_WALLET';

-- AlterEnum
ALTER TYPE "TransactionCategory" ADD VALUE 'CUSTODY_TRANSFER';

-- AlterEnum
BEGIN;
CREATE TYPE "TransactionStatus_new" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED');
ALTER TABLE "transactions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "transactions" ALTER COLUMN "status" TYPE "TransactionStatus_new" USING ("status"::text::"TransactionStatus_new");
ALTER TYPE "TransactionStatus" RENAME TO "TransactionStatus_old";
ALTER TYPE "TransactionStatus_new" RENAME TO "TransactionStatus";
DROP TYPE "TransactionStatus_old";
ALTER TABLE "transactions" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';
ALTER TYPE "UserRole" ADD VALUE 'PROJECT_MANAGER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkmanTrade" ADD VALUE 'CONCRETE';
ALTER TYPE "WorkmanTrade" ADD VALUE 'PLASTERER';
ALTER TYPE "WorkmanTrade" ADD VALUE 'FLOORING';
ALTER TYPE "WorkmanTrade" ADD VALUE 'GYPSUM';
ALTER TYPE "WorkmanTrade" ADD VALUE 'ALUMINUM';

-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "paymentTerms",
ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "material_usage" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "materials" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "managementFeePercent" DECIMAL(5,2),
ADD COLUMN     "officeRevenue" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "operationalFund" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "paymentTerms" TEXT NOT NULL DEFAULT 'Net 30',
ADD COLUMN     "revenueModel" "RevenueModel" NOT NULL DEFAULT 'EXECUTION_COST_PLUS',
ADD COLUMN     "tenantId" TEXT,
ADD COLUMN     "totalContractValue" DECIMAL(15,2);

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "aiExtractedData" JSONB,
ADD COLUMN     "aiRawText" TEXT,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "custodyWalletId" TEXT,
ADD COLUMN     "receiptPhotoUrl" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "tenantId" TEXT,
ADD COLUMN     "voiceNoteUrl" TEXT,
ADD COLUMN     "workmanId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "currentCustodyBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "pendingClearance" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "profilePicture" TEXT,
ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "workmanships" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "workmen" ADD COLUMN     "tenantId" TEXT,
ADD COLUMN     "totalPaid" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subscriptionPlan" TEXT NOT NULL DEFAULT 'FREE_PILOT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "logo" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_batches" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "initialValue" DECIMAL(15,2) NOT NULL,
    "remainingValue" DECIMAL(15,2) NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'AVAILABLE',
    "projectId" TEXT NOT NULL,
    "originalReceiptId" TEXT,
    "recordedBy" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "materialId" TEXT,

    CONSTRAINT "material_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custody_transfers" (
    "id" TEXT NOT NULL,
    "type" "CustodyTransferType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "description" TEXT NOT NULL,
    "engineerId" TEXT NOT NULL,
    "balanceBefore" DECIMAL(15,2) NOT NULL,
    "balanceAfter" DECIMAL(15,2) NOT NULL,
    "relatedTransactionId" TEXT,
    "tenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custody_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "resourceId" TEXT,
    "resourceType" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "material_batches_projectId_status_idx" ON "material_batches"("projectId", "status");

-- CreateIndex
CREATE INDEX "custody_transfers_engineerId_createdAt_idx" ON "custody_transfers"("engineerId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_usage" ADD CONSTRAINT "material_usage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_batches" ADD CONSTRAINT "material_batches_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_batches" ADD CONSTRAINT "material_batches_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_batches" ADD CONSTRAINT "material_batches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_batches" ADD CONSTRAINT "material_batches_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workmen" ADD CONSTRAINT "workmen_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workmanships" ADD CONSTRAINT "workmanships_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_workmanId_fkey" FOREIGN KEY ("workmanId") REFERENCES "workmen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custody_transfers" ADD CONSTRAINT "custody_transfers_engineerId_fkey" FOREIGN KEY ("engineerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custody_transfers" ADD CONSTRAINT "custody_transfers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

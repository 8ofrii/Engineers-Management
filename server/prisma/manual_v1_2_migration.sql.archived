-- V1.2 Manual Migration: Profit on Expense Logic
-- This migration adds new fields and tables without losing existing data
-- Run this manually if you want to avoid Prisma's reset

-- Step 1: Add projectSafeBalance to projects table
ALTER TABLE "projects" 
ADD COLUMN IF NOT EXISTS "projectSafeBalance" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- Step 2: Add projectCostItemId to transactions table
ALTER TABLE "transactions" 
ADD COLUMN IF NOT EXISTS "projectCostItemId" TEXT;

-- Step 3: Create project_cost_items table
CREATE TABLE IF NOT EXISTS "project_cost_items" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalQuantity" DECIMAL(15,2),
    "unitOfMeasure" TEXT,
    "unitPrice" DECIMAL(15,2),
    "estimatedTotal" DECIMAL(15,2),
    "totalPaid" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_cost_items_pkey" PRIMARY KEY ("id")
);

-- Step 4: Add foreign key constraints
ALTER TABLE "project_cost_items" 
ADD CONSTRAINT "project_cost_items_projectId_fkey" 
FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_cost_items" 
ADD CONSTRAINT "project_cost_items_tenantId_fkey" 
FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "transactions" 
ADD CONSTRAINT "transactions_projectCostItemId_fkey" 
FOREIGN KEY ("projectCostItemId") REFERENCES "project_cost_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 5: Initialize projectSafeBalance from operationalFund (optional, for existing projects)
-- Uncomment if you want to migrate existing balances
-- UPDATE "projects" 
-- SET "projectSafeBalance" = "operationalFund"
-- WHERE "projectSafeBalance" = 0;

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS "project_cost_items_projectId_idx" ON "project_cost_items"("projectId");
CREATE INDEX IF NOT EXISTS "project_cost_items_tenantId_idx" ON "project_cost_items"("tenantId");
CREATE INDEX IF NOT EXISTS "transactions_projectCostItemId_idx" ON "transactions"("projectCostItemId");

-- Migration complete!
-- Next steps:
-- 1. Update your application code to use the new V1.2 endpoints
-- 2. Test the new profit-on-expense logic
-- 3. Update frontend to support new features

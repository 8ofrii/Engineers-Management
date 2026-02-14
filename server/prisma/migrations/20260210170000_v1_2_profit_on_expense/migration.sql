-- V1.2 Migration: Baseline + New Features
-- This migration resolves drift and adds V1.2 features
-- Safe to run on production database

BEGIN;

-- ============================================
-- PART 1: Resolve Drift (Make schema match current DB state)
-- ============================================

-- The roles table and user changes already exist in the database
-- We just need to acknowledge them

-- ============================================
-- PART 2: Add V1.2 Features
-- ============================================

-- Add projectSafeBalance to projects
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'projectSafeBalance'
    ) THEN
        ALTER TABLE "projects" ADD COLUMN "projectSafeBalance" DECIMAL(15,2) NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Add projectCostItemId to transactions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'projectCostItemId'
    ) THEN
        ALTER TABLE "transactions" ADD COLUMN "projectCostItemId" TEXT;
    END IF;
END $$;

-- Create project_cost_items table
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_cost_items_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints (with IF NOT EXISTS check)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'project_cost_items_projectId_fkey'
    ) THEN
        ALTER TABLE "project_cost_items" 
        ADD CONSTRAINT "project_cost_items_projectId_fkey" 
        FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'project_cost_items_tenantId_fkey'
    ) THEN
        ALTER TABLE "project_cost_items" 
        ADD CONSTRAINT "project_cost_items_tenantId_fkey" 
        FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transactions_projectCostItemId_fkey'
    ) THEN
        ALTER TABLE "transactions" 
        ADD CONSTRAINT "transactions_projectCostItemId_fkey" 
        FOREIGN KEY ("projectCostItemId") REFERENCES "project_cost_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "project_cost_items_projectId_idx" ON "project_cost_items"("projectId");
CREATE INDEX IF NOT EXISTS "project_cost_items_tenantId_idx" ON "project_cost_items"("tenantId");
CREATE INDEX IF NOT EXISTS "transactions_projectCostItemId_idx" ON "transactions"("projectCostItemId");

-- Optional: Initialize projectSafeBalance from operationalFund for existing projects
-- UPDATE "projects" 
-- SET "projectSafeBalance" = "operationalFund"
-- WHERE "projectSafeBalance" = 0 AND "operationalFund" > 0;

COMMIT;

-- Migration complete!
-- Run this with: psql -h <host> -U <user> -d dood -f 20260210_v1_2_profit_on_expense.sql

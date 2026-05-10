@echo off
REM Quick V1.2 Migration for Local Development
echo ========================================
echo V1.2 Migration - Quick Setup
echo ========================================
echo.

echo Step 1: Creating migration directory...
cd server
if not exist "prisma\migrations\20260210170000_v1_2_profit_on_expense" (
    mkdir "prisma\migrations\20260210170000_v1_2_profit_on_expense"
)

echo Step 2: Copying migration SQL...
copy "prisma\migrations\20260210_v1_2_profit_on_expense.sql" "prisma\migrations\20260210170000_v1_2_profit_on_expense\migration.sql"

echo Step 3: Applying migration to remote database...
call npx prisma migrate deploy

echo.
echo Step 4: Generating Prisma Client...
call npx prisma generate

echo.
echo ========================================
echo Migration Complete!
echo ========================================
echo.
echo Starting server...
call npm run dev

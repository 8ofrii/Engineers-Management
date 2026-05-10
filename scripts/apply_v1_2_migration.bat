@echo off
REM V1.2 Migration Script for Windows
REM This script helps apply the V1.2 migration safely

echo ========================================
echo V1.2 Migration - Profit on Expense
echo ========================================
echo.

echo Step 1: Type N in the Prisma prompt to cancel the reset
echo.
pause

echo.
echo Step 2: Apply SQL migration to your database
echo.
echo Option A: Use a GUI tool (Recommended)
echo   - Open pgAdmin, DBeaver, or Render Dashboard
echo   - Connect to your database
echo   - Run the SQL file: server\prisma\migrations\20260210_v1_2_profit_on_expense.sql
echo.
echo Option B: Use psql command line
echo   psql -h dpg-crp9o3lds78s73d6ktpg-a.frankfurt-postgres.render.com ^
echo        -U your_username ^
echo        -d dood ^
echo        -f server\prisma\migrations\20260210_v1_2_profit_on_expense.sql
echo.
echo Press any key after you've successfully run the SQL...
pause

echo.
echo Step 3: Creating migration directory for Prisma tracking...
if not exist "server\prisma\migrations\20260210170000_v1_2_profit_on_expense" (
    mkdir "server\prisma\migrations\20260210170000_v1_2_profit_on_expense"
)

echo.
echo Step 4: Copying migration file...
copy "server\prisma\migrations\20260210_v1_2_profit_on_expense.sql" ^
     "server\prisma\migrations\20260210170000_v1_2_profit_on_expense\migration.sql"

echo.
echo Step 5: Marking migration as applied in Prisma...
cd server
call npx prisma migrate resolve --applied 20260210170000_v1_2_profit_on_expense

echo.
echo Step 6: Checking migration status...
call npx prisma migrate status

echo.
echo ========================================
echo Migration Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Restart your server: npm run dev
echo 2. Test the new V1.2 endpoints
echo 3. Update frontend (see V1.2_IMPLEMENTATION_GUIDE.md)
echo.
pause

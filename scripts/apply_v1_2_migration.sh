#!/bin/bash

# V1.2 Migration Script
# This script applies the V1.2 migration safely without resetting the database

echo "🚀 Starting V1.2 Migration..."
echo ""

# Step 1: Apply the SQL migration directly to the database
echo "📝 Step 1: Applying SQL migration to database..."
echo "Please run this SQL file in your database:"
echo "File: server/prisma/migrations/20260210_v1_2_profit_on_expense.sql"
echo ""
echo "You can:"
echo "1. Use pgAdmin or DBeaver GUI to run the SQL"
echo "2. Or use psql command line:"
echo ""
echo "psql -h dpg-crp9o3lds78s73d6ktpg-a.frankfurt-postgres.render.com \\"
echo "     -U your_username \\"
echo "     -d dood \\"
echo "     -f server/prisma/migrations/20260210_v1_2_profit_on_expense.sql"
echo ""
read -p "Press Enter after you've run the SQL migration..."

# Step 2: Create a migration directory for Prisma to track
echo ""
echo "📁 Step 2: Creating migration directory..."
mkdir -p server/prisma/migrations/20260210170000_v1_2_profit_on_expense

# Step 3: Copy the SQL file to the migration directory
echo "📋 Step 3: Copying migration file..."
cp server/prisma/migrations/20260210_v1_2_profit_on_expense.sql \
   server/prisma/migrations/20260210170000_v1_2_profit_on_expense/migration.sql

# Step 4: Mark the migration as applied
echo "✅ Step 4: Marking migration as applied..."
cd server
npx prisma migrate resolve --applied 20260210170000_v1_2_profit_on_expense

# Step 5: Verify
echo ""
echo "🔍 Step 5: Verifying migration..."
npx prisma migrate status

echo ""
echo "✨ Migration complete!"
echo ""
echo "Next steps:"
echo "1. Restart your server: npm run dev"
echo "2. Test the new endpoints"
echo "3. Update frontend (see V1.2_IMPLEMENTATION_GUIDE.md)"

#!/bin/bash

# Debatera Database Layer Validation Script
# This script validates the database layer implementation

echo "🔍 Debatera Database Layer Validation"
echo "======================================"
echo ""

# Check Prisma schema exists and is valid
echo "✓ Checking Prisma schema..."
if [ -f "prisma/schema.prisma" ]; then
  echo "  ✓ schema.prisma exists"
else
  echo "  ✗ schema.prisma not found"
  exit 1
fi

# Validate Prisma schema
echo "  ✓ Validating Prisma schema..."
export DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
npx prisma validate > /dev/null 2>&1
VALIDATE_EXIT=$?
unset DATABASE_URL
if [ $VALIDATE_EXIT -eq 0 ]; then
  echo "  ✓ Prisma schema is valid"
else
  echo "  ✗ Prisma schema validation failed"
  exit 1
fi

# Check seed script exists
echo ""
echo "✓ Checking seed script..."
if [ -f "prisma/seed.ts" ]; then
  echo "  ✓ seed.ts exists"
else
  echo "  ✗ seed.ts not found"
  exit 1
fi

# Check migration exists
echo ""
echo "✓ Checking migrations..."
if [ -d "prisma/migrations" ]; then
  echo "  ✓ migrations directory exists"
  MIGRATION_COUNT=$(find prisma/migrations -name "migration.sql" | wc -l)
  echo "  ✓ Found $MIGRATION_COUNT migration(s)"
else
  echo "  ✗ migrations directory not found"
  exit 1
fi

# Check API routes
echo ""
echo "✓ Checking API routes..."

API_ROUTES=(
  "src/app/api/tournaments/route.ts"
  "src/app/api/tournaments/[id]/verify/route.ts"
  "src/app/api/teams/route.ts"
  "src/app/api/teams/[id]/members/route.ts"
  "src/app/api/debates/route.ts"
  "src/app/api/debates/[id]/route.ts"
  "src/app/api/debates/[id]/participants/route.ts"
  "src/app/api/debates/[id]/feedback/route.ts"
  "src/app/api/debates/[id]/decide/route.ts"
)

MISSING=0
for route in "${API_ROUTES[@]}"; do
  if [ -f "$route" ]; then
    echo "  ✓ $route"
  else
    echo "  ✗ $route not found"
    MISSING=$((MISSING + 1))
  fi
done

if [ $MISSING -gt 0 ]; then
  echo "  ✗ $MISSING API route(s) missing"
  exit 1
fi

# Check auth helper
echo ""
echo "✓ Checking auth helper..."
if [ -f "src/lib/auth.ts" ]; then
  echo "  ✓ auth.ts exists"
else
  echo "  ✗ auth.ts not found"
  exit 1
fi

# Check documentation
echo ""
echo "✓ Checking documentation..."
if [ -f "DATABASE.md" ]; then
  echo "  ✓ DATABASE.md exists"
else
  echo "  ✗ DATABASE.md not found"
  exit 1
fi

# Check .env.example
echo ""
echo "✓ Checking .env.example..."
if grep -q "DATABASE_URL" .env.example; then
  echo "  ✓ DATABASE_URL in .env.example"
else
  echo "  ✗ DATABASE_URL not in .env.example"
  exit 1
fi

# Generate Prisma client
echo ""
echo "✓ Generating Prisma client..."
npx prisma generate > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "  ✓ Prisma client generated successfully"
else
  echo "  ✗ Failed to generate Prisma client"
  exit 1
fi

# Check TypeScript compilation
echo ""
echo "✓ Checking TypeScript compilation..."
npx tsc --noEmit > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "  ✓ TypeScript compilation successful"
else
  echo "  ✗ TypeScript compilation failed"
  echo "  Run 'npx tsc --noEmit' for details"
  exit 1
fi

# Summary
echo ""
echo "======================================"
echo "✅ All validation checks passed!"
echo ""
echo "Next steps:"
echo "1. Set up your DATABASE_URL in .env"
echo "2. Run: npx prisma migrate dev"
echo "3. Run: npx prisma db seed"
echo "4. Start the dev server: npm run dev"
echo "5. Test the API endpoints (see API_TESTING.md)"
echo ""

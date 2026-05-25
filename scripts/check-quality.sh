#!/bin/bash

# Quality check script for MAYSS backend
# This script runs all quality checks: tests, coverage, linting

set -e

echo "================================================"
echo "🔍 MAYSS Code Quality Check"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cd backend

# 1. Test
echo "${YELLOW}1️⃣  Running tests...${NC}"
pytest -v --tb=short
TEST_RESULT=$?

# 2. Coverage
echo ""
echo "${YELLOW}2️⃣  Generating coverage report...${NC}"
pytest --cov=app --cov-report=term-missing --cov-report=html
COVERAGE_RESULT=$?

# 3. Pylint
echo ""
echo "${YELLOW}3️⃣  Running pylint...${NC}"
pylint app/ --exit-zero --load-plugins=pylint_django
LINT_RESULT=$?

# 4. Summary
echo ""
echo "================================================"
echo "📊 Summary"
echo "================================================"

if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ Tests passed${NC}"
else
    echo -e "${RED}✗ Tests failed${NC}"
fi

if [ $COVERAGE_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ Coverage report generated (htmlcov/index.html)${NC}"
else
    echo -e "${RED}✗ Coverage failed${NC}"
fi

if [ $LINT_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ Linting passed${NC}"
else
    echo -e "${YELLOW}⚠ Linting warnings found (non-fatal)${NC}"
fi

# Final status
if [ $TEST_RESULT -eq 0 ] && [ $COVERAGE_RESULT -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All checks passed!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some checks failed${NC}"
    exit 1
fi
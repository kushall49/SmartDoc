#!/bin/bash

##############################################################################
# TestSpirit AI Debugging Pipeline
# Automated code analysis and quality checks for SmartDocIQ
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Output directory
OUTPUT_DIR="./testspirit"
REPORT_FILE="$OUTPUT_DIR/report.json"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Initialize report
echo "{" > "$REPORT_FILE"
echo '  "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",' >> "$REPORT_FILE"
echo '  "project": "SmartDocIQ",' >> "$REPORT_FILE"
echo '  "checks": {' >> "$REPORT_FILE"

echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         TestSpirit AI Debugging Pipeline              ║${NC}"
echo -e "${CYAN}║              SmartDocIQ Analysis                       ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

TOTAL_ERRORS=0
TOTAL_WARNINGS=0
TOTAL_CRITICAL=0

##############################################################################
# 1. TypeScript Type Checking
##############################################################################
echo -e "${BLUE}[1/7] Running TypeScript Type Checker...${NC}"
if npm run type-check > "$OUTPUT_DIR/typescript.log" 2>&1; then
    echo -e "${GREEN}✓ TypeScript: No type errors${NC}"
    echo '    "typescript": { "status": "pass", "errors": 0 },' >> "$REPORT_FILE"
else
    TS_ERRORS=$(grep -c "error TS" "$OUTPUT_DIR/typescript.log" || echo "0")
    TOTAL_ERRORS=$((TOTAL_ERRORS + TS_ERRORS))
    echo -e "${RED}✗ TypeScript: Found $TS_ERRORS type errors${NC}"
    echo "    \"typescript\": { \"status\": \"fail\", \"errors\": $TS_ERRORS }," >> "$REPORT_FILE"
fi
echo ""

##############################################################################
# 2. ESLint - Code Quality & Code Smells
##############################################################################
echo -e "${BLUE}[2/7] Running ESLint (Code Quality, Smells, Unused Imports)...${NC}"
if npx eslint . --ext .ts,.tsx,.js,.jsx --format json > "$OUTPUT_DIR/eslint.json" 2>&1; then
    echo -e "${GREEN}✓ ESLint: No issues found${NC}"
    echo '    "eslint": { "status": "pass", "errors": 0, "warnings": 0 },' >> "$REPORT_FILE"
else
    ESLINT_ERRORS=$(jq '[.[] | .errorCount] | add // 0' "$OUTPUT_DIR/eslint.json" 2>/dev/null || echo "0")
    ESLINT_WARNINGS=$(jq '[.[] | .warningCount] | add // 0' "$OUTPUT_DIR/eslint.json" 2>/dev/null || echo "0")
    TOTAL_ERRORS=$((TOTAL_ERRORS + ESLINT_ERRORS))
    TOTAL_WARNINGS=$((TOTAL_WARNINGS + ESLINT_WARNINGS))
    echo -e "${RED}✗ ESLint: $ESLINT_ERRORS errors, $ESLINT_WARNINGS warnings${NC}"
    echo "    \"eslint\": { \"status\": \"fail\", \"errors\": $ESLINT_ERRORS, \"warnings\": $ESLINT_WARNINGS }," >> "$REPORT_FILE"
fi
echo ""

##############################################################################
# 3. Snyk Security Scan
##############################################################################
echo -e "${BLUE}[3/7] Running Snyk Security Scan (Vulnerabilities)...${NC}"
if command -v snyk &> /dev/null; then
    if snyk test --json > "$OUTPUT_DIR/snyk.json" 2>&1; then
        echo -e "${GREEN}✓ Snyk: No vulnerabilities found${NC}"
        echo '    "snyk": { "status": "pass", "vulnerabilities": 0 },' >> "$REPORT_FILE"
    else
        SNYK_VULNS=$(jq '.vulnerabilities | length // 0' "$OUTPUT_DIR/snyk.json" 2>/dev/null || echo "0")
        SNYK_CRITICAL=$(jq '[.vulnerabilities[] | select(.severity == "critical")] | length // 0' "$OUTPUT_DIR/snyk.json" 2>/dev/null || echo "0")
        TOTAL_CRITICAL=$((TOTAL_CRITICAL + SNYK_CRITICAL))
        echo -e "${RED}✗ Snyk: Found $SNYK_VULNS vulnerabilities ($SNYK_CRITICAL critical)${NC}"
        echo "    \"snyk\": { \"status\": \"fail\", \"vulnerabilities\": $SNYK_VULNS, \"critical\": $SNYK_CRITICAL }," >> "$REPORT_FILE"
    fi
else
    echo -e "${YELLOW}⚠ Snyk CLI not installed - skipping security scan${NC}"
    echo '    "snyk": { "status": "skipped", "reason": "CLI not installed" },' >> "$REPORT_FILE"
fi
echo ""

##############################################################################
# 4. Unused Exports Detection
##############################################################################
echo -e "${BLUE}[4/7] Detecting Unused Exports...${NC}"
if command -v ts-prune &> /dev/null; then
    UNUSED_COUNT=$(npx ts-prune | grep -c "used in module" || echo "0")
    if [ "$UNUSED_COUNT" -eq 0 ]; then
        echo -e "${GREEN}✓ No unused exports detected${NC}"
        echo '    "unusedExports": { "status": "pass", "count": 0 },' >> "$REPORT_FILE"
    else
        TOTAL_WARNINGS=$((TOTAL_WARNINGS + UNUSED_COUNT))
        echo -e "${YELLOW}⚠ Found $UNUSED_COUNT unused exports${NC}"
        echo "    \"unusedExports\": { \"status\": \"warning\", \"count\": $UNUSED_COUNT }," >> "$REPORT_FILE"
    fi
else
    echo -e "${YELLOW}⚠ ts-prune not installed - skipping unused exports check${NC}"
    echo '    "unusedExports": { "status": "skipped", "reason": "ts-prune not installed" },' >> "$REPORT_FILE"
fi
echo ""

##############################################################################
# 5. Async/Await Pattern Check
##############################################################################
echo -e "${BLUE}[5/7] Checking Async/Await Patterns...${NC}"
FLOATING_PROMISES=$(grep -r "async function" src --include="*.ts" --include="*.tsx" | wc -l || echo "0")
echo -e "${GREEN}✓ Found $FLOATING_PROMISES async functions (manual review recommended)${NC}"
echo "    \"asyncAwait\": { \"status\": \"info\", \"asyncFunctions\": $FLOATING_PROMISES }," >> "$REPORT_FILE"
echo ""

##############################################################################
# 6. API Route Analysis
##############################################################################
echo -e "${BLUE}[6/7] Analyzing API Routes...${NC}"
API_ROUTES=$(find src/app/api -name "route.ts" 2>/dev/null | wc -l || echo "0")
API_ERRORS=$(grep -r "TODO\|FIXME\|XXX\|HACK" src/app/api --include="*.ts" 2>/dev/null | wc -l || echo "0")
if [ "$API_ERRORS" -eq 0 ]; then
    echo -e "${GREEN}✓ API Routes: $API_ROUTES routes analyzed, no issues${NC}"
    echo "    \"apiRoutes\": { \"status\": \"pass\", \"routesCount\": $API_ROUTES, \"issues\": 0 }," >> "$REPORT_FILE"
else
    echo -e "${YELLOW}⚠ API Routes: Found $API_ERRORS TODO/FIXME comments${NC}"
    echo "    \"apiRoutes\": { \"status\": \"warning\", \"routesCount\": $API_ROUTES, \"issues\": $API_ERRORS }," >> "$REPORT_FILE"
fi
echo ""

##############################################################################
# 7. Performance Analysis (Bundle Size)
##############################################################################
echo -e "${BLUE}[7/7] Performance Analysis...${NC}"
if [ -d ".next" ]; then
    BUNDLE_SIZE=$(du -sh .next 2>/dev/null | cut -f1 || echo "unknown")
    echo -e "${GREEN}✓ Build bundle size: $BUNDLE_SIZE${NC}"
    echo "    \"performance\": { \"status\": \"info\", \"bundleSize\": \"$BUNDLE_SIZE\" }" >> "$REPORT_FILE"
else
    echo -e "${YELLOW}⚠ No build found - run 'npm run build' first${NC}"
    echo '    "performance": { "status": "skipped", "reason": "No build found" }' >> "$REPORT_FILE"
fi
echo ""

##############################################################################
# Finalize Report
##############################################################################
echo '  },' >> "$REPORT_FILE"
echo "  \"summary\": {" >> "$REPORT_FILE"
echo "    \"totalErrors\": $TOTAL_ERRORS," >> "$REPORT_FILE"
echo "    \"totalWarnings\": $TOTAL_WARNINGS," >> "$REPORT_FILE"
echo "    \"criticalIssues\": $TOTAL_CRITICAL" >> "$REPORT_FILE"
echo "  }" >> "$REPORT_FILE"
echo "}" >> "$REPORT_FILE"

##############################################################################
# Summary
##############################################################################
echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    Summary Report                      ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo -e "Total Errors:          ${RED}$TOTAL_ERRORS${NC}"
echo -e "Total Warnings:        ${YELLOW}$TOTAL_WARNINGS${NC}"
echo -e "Critical Issues:       ${RED}$TOTAL_CRITICAL${NC}"
echo ""
echo -e "Full report saved to: ${CYAN}$REPORT_FILE${NC}"
echo ""

##############################################################################
# Exit Code
##############################################################################
if [ "$TOTAL_CRITICAL" -gt 0 ]; then
    echo -e "${RED}❌ TestSpirit FAILED: Critical issues found!${NC}"
    exit 2
elif [ "$TOTAL_ERRORS" -gt 0 ]; then
    echo -e "${RED}❌ TestSpirit FAILED: Errors found!${NC}"
    exit 1
elif [ "$TOTAL_WARNINGS" -gt 5 ]; then
    echo -e "${YELLOW}⚠️  TestSpirit WARNING: Many warnings found${NC}"
    exit 0
else
    echo -e "${GREEN}✅ TestSpirit PASSED: All checks successful!${NC}"
    exit 0
fi

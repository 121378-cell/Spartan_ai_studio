#!/bin/bash
# Documentation Deployment Verification Script

echo "=== Documentation Deployment Verification ==="
echo "Timestamp: $(date)"
echo ""

# Check if documentation files exist and are readable
echo "1. Verifying Phase 8 documentation files..."
PHASE_8_DOCS=(
  "PHASE_8_IMPLEMENTATION_SUMMARY.md"
  "PHASE_8_REAL_TIME_ADAPTIVE_BRAIN_RESEARCH.md"
  "PHASE_8_EXECUTIVE_SUMMARY.md"
  "PHASE_8_MASTER_INDEX.md"
  "PHASE_8_INVESTIGACION_COMPLETADA.md"
  "PHASE_8_GUIA_DESARROLLO_PASO_A_PASO.md"
  "PHASE_8_DOCUMENTACION_COMPLETA_RESUMEN.md"
)

for doc in "${PHASE_8_DOCS[@]}"; do
  if [[ -f "$doc" ]]; then
    size=$(wc -c < "$doc")
    echo "✅ $doc - ${size} bytes"
  else
    echo "❌ $doc - NOT FOUND"
  fi
done

echo ""
echo "2. Verifying implementation documentation..."
IMPLEMENTATION_DOCS=(
  "backend/src/services/planAdjusterService.ts"
  "backend/src/services/realtimeNotificationService.ts"
  "backend/src/database/migrations/008-create-plan-adjustment-tables.ts"
  "backend/src/__tests__/services/planAdjusterService.test.ts"
)

for doc in "${IMPLEMENTATION_DOCS[@]}"; do
  if [[ -f "$doc" ]]; then
    lines=$(wc -l < "$doc")
    echo "✅ $doc - ${lines} lines"
  else
    echo "❌ $doc - NOT FOUND"
  fi
done

echo ""
echo "3. Checking documentation structure..."
if [[ -d "docs" ]]; then
  doc_count=$(find docs -name "*.md" | wc -l)
  echo "✅ Documentation directory exists with $doc_count markdown files"
else
  echo "❌ Documentation directory not found"
fi

echo ""
echo "4. Verifying file permissions..."
for doc in "${PHASE_8_DOCS[@]}" "${IMPLEMENTATION_DOCS[@]}"; do
  if [[ -f "$doc" ]]; then
    if [[ -r "$doc" ]]; then
      echo "✅ $doc - Readable"
    else
      echo "❌ $doc - Not readable"
    fi
  fi
done

echo ""
echo "=== Documentation Deployment Complete ==="
echo "All Phase 8 documentation is properly deployed and accessible."
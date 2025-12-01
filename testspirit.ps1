# TestSpirit AI Debugging Pipeline
# Comprehensive code analysis and error detection

$ErrorActionPreference = "Continue"
$OutputPath = ".\testspirit"
$ReportFile = "$OutputPath\report.json"

# Create output directory
if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath | Out-Null
}

Write-Host "=== TestSpirit AI Debugging Pipeline ===" -ForegroundColor Cyan
Write-Host ""

# Initialize results
$TotalErrors = 0
$TotalWarnings = 0
$TotalCritical = 0
$Results = @{
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    checks = @()
}

# Check 1: TypeScript Type Checking
Write-Host "[1/7] Running TypeScript Type Check..." -ForegroundColor Blue
try {
    $tsOutput = npm run type-check 2>&1 | Out-String
    $tsErrors = ($tsOutput | Select-String "error TS" -AllMatches).Matches.Count
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  PASS: No TypeScript errors" -ForegroundColor Green
        $Results.checks += @{
            name = "TypeScript"
            status = "pass"
            errors = 0
        }
    } else {
        Write-Host "  FAIL: Found $tsErrors TypeScript errors" -ForegroundColor Red
        $TotalErrors += $tsErrors
        $TotalCritical += 1
        $Results.checks += @{
            name = "TypeScript"
            status = "fail"
            errors = $tsErrors
        }
    }
} catch {
    Write-Host "  ERROR: TypeScript check failed" -ForegroundColor Red
    $TotalCritical += 1
}

Write-Host ""

# Check 2: ESLint
Write-Host "[2/7] Running ESLint..." -ForegroundColor Blue
try {
    $eslintOutput = npx eslint "src/**/*.{ts,tsx}" --format compact 2>&1 | Out-String
    $eslintErrors = ($eslintOutput | Select-String " error " -AllMatches).Matches.Count
    $eslintWarnings = ($eslintOutput | Select-String " warning " -AllMatches).Matches.Count
    
    if ($eslintErrors -eq 0) {
        Write-Host "  PASS: No ESLint errors ($eslintWarnings warnings)" -ForegroundColor Green
        $TotalWarnings += $eslintWarnings
        $Results.checks += @{
            name = "ESLint"
            status = "pass"
            errors = 0
            warnings = $eslintWarnings
        }
    } else {
        Write-Host "  FAIL: Found $eslintErrors ESLint errors, $eslintWarnings warnings" -ForegroundColor Yellow
        $TotalErrors += $eslintErrors
        $TotalWarnings += $eslintWarnings
        $Results.checks += @{
            name = "ESLint"
            status = "fail"
            errors = $eslintErrors
            warnings = $eslintWarnings
        }
    }
} catch {
    Write-Host "  SKIP: ESLint not available" -ForegroundColor Yellow
}

Write-Host ""

# Check 3: Code Issues (console.log, TODO, FIXME)
Write-Host "[3/7] Scanning for Code Issues..." -ForegroundColor Blue
try {
    $consoleLogs = (Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" | Select-String "console\.(log|warn|error)" -AllMatches).Matches.Count
    $todos = (Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" | Select-String "TODO|FIXME" -AllMatches).Matches.Count
    
    Write-Host "  INFO: Found $consoleLogs console statements, $todos TODOs" -ForegroundColor Cyan
    $TotalWarnings += $consoleLogs + $todos
    $Results.checks += @{
        name = "Code Issues"
        status = "info"
        consoleLogs = $consoleLogs
        todos = $todos
    }
} catch {
    Write-Host "  SKIP: Code scan failed" -ForegroundColor Yellow
}

Write-Host ""

# Check 4: Potential Issues
Write-Host "[4/7] Checking Potential Issues..." -ForegroundColor Blue
try {
    $emptyCatch = (Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" | Select-String "catch.*\{\s*\}" -AllMatches).Matches.Count
    $anyTypes = (Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" | Select-String ": any" -AllMatches).Matches.Count
    
    Write-Host "  INFO: Found $emptyCatch empty catch blocks, $anyTypes 'any' types" -ForegroundColor Cyan
    $TotalWarnings += $emptyCatch
    $Results.checks += @{
        name = "Potential Issues"
        status = "info"
        emptyCatch = $emptyCatch
        anyTypes = $anyTypes
    }
} catch {
    Write-Host "  SKIP: Potential issues scan failed" -ForegroundColor Yellow
}

Write-Host ""

# Check 5: Async/Await Patterns
Write-Host "[5/7] Analyzing Async/Await Patterns..." -ForegroundColor Blue
try {
    $asyncFunctions = (Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" | Select-String "async function|async \(" -AllMatches).Matches.Count
    $awaitCalls = (Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" | Select-String "await " -AllMatches).Matches.Count
    
    Write-Host "  INFO: Found $asyncFunctions async functions, $awaitCalls await calls" -ForegroundColor Cyan
    $Results.checks += @{
        name = "Async/Await"
        status = "info"
        asyncFunctions = $asyncFunctions
        awaitCalls = $awaitCalls
    }
} catch {
    Write-Host "  SKIP: Async pattern scan failed" -ForegroundColor Yellow
}

Write-Host ""

# Check 6: API Routes Analysis
Write-Host "[6/7] Analyzing API Routes..." -ForegroundColor Blue
try {
    $apiRoutes = (Get-ChildItem -Path "src/app/api" -Recurse -Include "route.ts").Count
    $exportedHandlers = (Get-ChildItem -Path "src/app/api" -Recurse -Include "route.ts" | Select-String "export.*GET|POST|PUT|DELETE|PATCH" -AllMatches).Matches.Count
    
    Write-Host "  INFO: Found $apiRoutes API routes, $exportedHandlers exported handlers" -ForegroundColor Cyan
    $Results.checks += @{
        name = "API Routes"
        status = "info"
        routes = $apiRoutes
        handlers = $exportedHandlers
    }
} catch {
    Write-Host "  SKIP: API routes scan failed" -ForegroundColor Yellow
}

Write-Host ""

# Check 7: Performance & Best Practices
Write-Host "[7/7] Performance Analysis..." -ForegroundColor Blue
try {
    $useEffects = (Get-ChildItem -Path "src" -Recurse -Include "*.tsx" | Select-String "useEffect" -AllMatches).Matches.Count
    $useStates = (Get-ChildItem -Path "src" -Recurse -Include "*.tsx" | Select-String "useState" -AllMatches).Matches.Count
    $largeFiles = (Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" | Where-Object { $_.Length -gt 10KB }).Count
    
    Write-Host "  INFO: Found $useEffects useEffect, $useStates useState, $largeFiles large files (>10KB)" -ForegroundColor Cyan
    $Results.checks += @{
        name = "Performance"
        status = "info"
        useEffects = $useEffects
        useStates = $useStates
        largeFiles = $largeFiles
    }
} catch {
    Write-Host "  SKIP: Performance scan failed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Total Errors:   $TotalErrors" -ForegroundColor $(if ($TotalErrors -eq 0) { "Green" } else { "Red" })
Write-Host "Total Warnings: $TotalWarnings" -ForegroundColor Yellow
Write-Host "Critical:       $TotalCritical" -ForegroundColor $(if ($TotalCritical -eq 0) { "Green" } else { "Red" })
Write-Host ""

# Save results
$Results.summary = @{
    totalErrors = $TotalErrors
    totalWarnings = $TotalWarnings
    critical = $TotalCritical
}

$Results | ConvertTo-Json -Depth 10 | Out-File -FilePath $ReportFile -Encoding UTF8
Write-Host "Report saved to: $ReportFile" -ForegroundColor Green
Write-Host ""

# Exit with appropriate code
if ($TotalCritical -gt 0) {
    Write-Host "CRITICAL ISSUES FOUND - Immediate action required" -ForegroundColor Red
    exit 2
} elseif ($TotalErrors -gt 0) {
    Write-Host "ERRORS FOUND - Please review and fix" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "ALL CHECKS PASSED" -ForegroundColor Green
    exit 0
}

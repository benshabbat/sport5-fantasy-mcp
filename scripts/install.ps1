# Sport5 Fantasy League MCP - PowerShell Installation Script
# סקריפט התקנה למערכת ה-MCP של Fantasy League

Write-Host "🏆 מתקין Sport5 Fantasy League MCP..." -ForegroundColor Green
Write-Host "================================="

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js מותקן: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js לא מותקן. אנא התקן Node.js 18+ ונסה שוב." -ForegroundColor Red
    Write-Host "https://nodejs.org/en/download/" -ForegroundColor Yellow
    exit 1
}

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ לא נמצא package.json. ודא שאתה בתיקיית הפרויקט הנכונה" -ForegroundColor Red
    exit 1
}

$packageJson = Get-Content "package.json" | ConvertFrom-Json
if ($packageJson.name -ne "sport5-fantasy-mcp") {
    Write-Host "❌ נראה שאתה לא בתיקיית Sport5 Fantasy MCP" -ForegroundColor Red
    exit 1
}

Write-Host "✅ מיקום נכון זוהה" -ForegroundColor Green

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 מתקין תלויות..." -ForegroundColor Blue
    npm install
    Write-Host "✅ תלויות הותקנו בהצלחה" -ForegroundColor Green
} else {
    Write-Host "✅ תלויות כבר מותקנות" -ForegroundColor Green
}

# Build the project
Write-Host "🔨 בונה את הפרויקט..." -ForegroundColor Blue
npm run build
Write-Host "✅ בנייה הושלמה בהצלחה" -ForegroundColor Green

# Test the build
Write-Host "🧪 בודק את המערכת..." -ForegroundColor Blue
node scripts/test.mjs

Write-Host ""
Write-Host "🎉 ההתקנה הושלמה בהצלחה!" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 הוראות שימוש:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. השגת Cookies:" -ForegroundColor Cyan
Write-Host "   - לך ל-https://fantasyleague.sport5.co.il/my-team" -ForegroundColor White
Write-Host "   - התחבר לחשבון שלך" -ForegroundColor White
Write-Host "   - פתח Console (F12) והרץ את הסקריפט מ-scripts/cookie-extractor.js" -ForegroundColor White
Write-Host ""
Write-Host "2. הגדרת Claude Desktop:" -ForegroundColor Cyan
Write-Host "   הוסף ל-%APPDATA%\Claude\claude_desktop_config.json:" -ForegroundColor White
Write-Host ""
$currentPath = (Get-Location).Path.Replace('\', '/')
$configJson = @"
{
  "mcpServers": {
    "sport5-fantasy": {
      "command": "node",
      "args": ["$currentPath/dist/index.js"],
      "env": {
        "SPORT5_AUTH_COOKIE": "your_cookies_here"
      }
    }
  }
}
"@
Write-Host $configJson -ForegroundColor Gray
Write-Host ""
Write-Host "3. הפעל מחדש את Claude Desktop" -ForegroundColor White
Write-Host "4. התחל לשאול: 'בדוק את הקבוצה שלי ב-Fantasy League'" -ForegroundColor White
Write-Host ""
Write-Host "🏆 בהצלחה בליגת החלומות!" -ForegroundColor Green

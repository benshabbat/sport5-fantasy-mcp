#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 הגדרת Sport5 Fantasy League MCP');
console.log('==================================');

// Check if Node.js is the right version
const nodeVersion = process.version.slice(1).split('.')[0];
if (parseInt(nodeVersion) < 18) {
    console.error('❌ נדרש Node.js גרסה 18 או יותר. הגרסה הנוכחית:', process.version);
    process.exit(1);
}

console.log('✅ Node.js מותקן:', process.version);

// Check if we're in the right directory
const packagePath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packagePath)) {
    console.error('❌ לא נמצא package.json. ודא שאתה בתיקיית הפרויקט הנכונה');
    process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
if (packageJson.name !== 'sport5-fantasy-mcp') {
    console.error('❌ נראה שאתה לא בתיקיית Sport5 Fantasy MCP');
    process.exit(1);
}

console.log('✅ מיקום נכון זוהה');

// Install dependencies if needed
const nodeModulesPath = path.join(process.cwd(), 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
    console.log('📦 מתקין תלויות...');
    try {
        execSync('npm install', { stdio: 'inherit' });
        console.log('✅ תלויות הותקנו בהצלחה');
    } catch (error) {
        console.error('❌ שגיאה בהתקנת תלויות:', error.message);
        process.exit(1);
    }
} else {
    console.log('✅ תלויות כבר מותקנות');
}

// Build the project
console.log('🔨 בונה את הפרויקט...');
try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ בנייה הושלמה בהצלחה');
} catch (error) {
    console.error('❌ שגיאה בבנייה:', error.message);
    process.exit(1);
}

// Interactive setup for environment variables
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise(resolve => {
        rl.question(prompt, resolve);
    });
}

async function setupEnvironment() {
    console.log('\n📋 הגדרת משתני סביבה');
    console.log('=====================');
    
    console.log('כדי להשיג cookies:');
    console.log('1. לך ל-https://fantasyleague.sport5.co.il/my-team');
    console.log('2. התחבר לחשבון שלך');
    console.log('3. פתח Console (F12) והרץ את הסקריפט scripts/cookie-extractor.js');
    console.log('4. העתק את מחרוזת ה-Cookies שתקבל');
    console.log('');
    
    const authCookie = await question('הזן את מחרוזת ה-Cookies (או ENTER לדלג): ');
    const userId = await question('הזן User ID (אופציונלי, ENTER לדלג): ');
    const leagueId = await question('הזן League ID (אופציונלי, ENTER לדלג): ');
    
    // Create .env file
    const envContent = `# Sport5 Fantasy League Configuration
SPORT5_BASE_URL=https://fantasyleague.sport5.co.il
SPORT5_AUTH_COOKIE=${authCookie}
SPORT5_USER_ID=${userId}
SPORT5_LEAGUE_ID=${leagueId}
`;

    const envPath = path.join(process.cwd(), '.env');
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ הגדרות נשמרו בקובץ .env');
    
    // Test the configuration if cookies were provided
    if (authCookie.trim()) {
        console.log('\n🧪 בודק את החיבור...');
        try {
            // Basic test - try to import and initialize
            const { Sport5FantasyAPI } = require('./dist/index.js');
            console.log('✅ מודול נטען בהצלחה');
            console.log('⚠️  לבדיקה מלאה, הרץ: npm start');
        } catch (error) {
            console.log('⚠️  לא ניתן לבדוק את החיבור כעת');
            console.log('   הרץ npm start לבדיקה מלאה');
        }
    }
    
    rl.close();
}

async function createClaudeConfig() {
    console.log('\n🤖 הגדרת Claude Desktop');
    console.log('=======================');
    
    const projectPath = process.cwd();
    const distPath = path.join(projectPath, 'dist', 'index.js');
    
    const claudeConfig = {
        "mcpServers": {
            "sport5-fantasy": {
                "command": "node",
                "args": [distPath]
            }
        }
    };
    
    console.log('הוסף את הקונפיגורציה הבאה לקובץ Claude Desktop:');
    console.log('');
    console.log('Windows: %APPDATA%\\Claude\\claude_desktop_config.json');
    console.log('macOS: ~/Library/Application Support/Claude/claude_desktop_config.json');
    console.log('');
    console.log(JSON.stringify(claudeConfig, null, 2));
    console.log('');
    
    const wantsSample = await question('האם תרצה שאציג דוגמאות פקודות? (y/n): ');
    if (wantsSample.toLowerCase() === 'y' || wantsSample.toLowerCase() === 'yes') {
        showUsageExamples();
    }
}

function showUsageExamples() {
    console.log('\n💬 דוגמאות פקודות ב-Claude');
    console.log('==========================');
    
    const examples = [
        '🔍 "בדוק את הקבוצה שלי ב-Fantasy League"',
        '🎯 "מצא לי את 5 החלוצים הטובים ביותר במחיר עד 20 מיליון"',
        '🤖 "נתח את הקבוצה שלי ותן המלצות לאופטימיזציה"',
        '⚡ "בצע את המעברים המומלצים אם זה נראה טוב"',
        '👑 "מי צריך להיות הקפטן שלי השבוע?"',
        '📊 "מה הסטטיסטיקות של הסיבוב הנוכח?"'
    ];
    
    examples.forEach(example => console.log(example));
}

async function main() {
    await setupEnvironment();
    await createClaudeConfig();
    
    console.log('\n🎉 ההתקנה הושלמה בהצלחה!');
    console.log('============================');
    console.log('');
    console.log('שלבים הבאים:');
    console.log('1. הוסף את הקונפיגורציה ל-Claude Desktop');
    console.log('2. הפעל מחדש את Claude Desktop');
    console.log('3. התחל לשאול שאלות על Fantasy League!');
    console.log('');
    console.log('📚 לתיעוד מלא ראה README.md');
    console.log('🔧 לבעיות פנה לתיעוד או צור issue');
    console.log('');
    console.log('🏆 בהצלחה בליגת החלומות!');
}

main().catch(console.error);

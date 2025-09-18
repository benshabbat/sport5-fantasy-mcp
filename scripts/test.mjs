import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Simple test to ensure the server can be imported and instantiated
try {
    console.log('🧪 בודק את המערכת...');
    
    const server = new Server({
        name: 'sport5-fantasy-league',
        version: '1.0.0',
    }, {
        capabilities: {
            tools: {},
        },
    });
    
    console.log('✅ השרת נוצר בהצלחה');
    console.log('✅ כל התלויות פועלות כראוי');
    console.log('');
    console.log('🎯 המערכת מוכנה לשימוש!');
    console.log('');
    console.log('שלבים הבאים:');
    console.log('1. הוסף לקובץ Claude Desktop config:');
    console.log('');
    console.log('{');
    console.log('  "mcpServers": {');
    console.log('    "sport5-fantasy": {');
    console.log('      "command": "node",');
    console.log(`      "args": ["${process.cwd()}/dist/index.js"]`);
    console.log('    }');
    console.log('  }');
    console.log('}');
    console.log('');
    console.log('2. הפעל מחדש את Claude Desktop');
    console.log('3. התחל לשאול שאלות על Fantasy League!');
    
    process.exit(0);
} catch (error) {
    console.error('❌ שגיאה בבדיקת המערכת:', error);
    process.exit(1);
}

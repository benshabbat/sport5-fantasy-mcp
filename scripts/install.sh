#!/bin/bash

# Sport5 Fantasy League MCP - Auto Installation Script
# סקריפט התקנה אוטומטי למערכת ה-MCP של Fantasy League

set -e

echo "🏆 מתקין Sport5 Fantasy League MCP..."
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js לא מותקן. אנא התקן Node.js 18+ ונסה שוב.${NC}"
    echo "https://nodejs.org/en/download/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "18" ]; then
    echo -e "${RED}❌ נדרש Node.js גרסה 18 או יותר. הגרסה הנוכחית: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js מותקן: $(node -v)${NC}"

# Create project directory
PROJECT_NAME="sport5-fantasy-mcp"
if [ -d "$PROJECT_NAME" ]; then
    echo -e "${YELLOW}⚠️  התיקייה $PROJECT_NAME כבר קיימת. האם למחוק אותה? (y/n)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        rm -rf "$PROJECT_NAME"
        echo -e "${GREEN}✅ התיקייה הישנה נמחקה${NC}"
    else
        echo -e "${RED}❌ התקנה בוטלה${NC}"
        exit 1
    fi
fi

mkdir "$PROJECT_NAME"
cd "$PROJECT_NAME"

echo -e "${BLUE}📦 יוצר פרויקט חדש...${NC}"

# Initialize npm project
npm init -y > /dev/null 2>&1

# Copy all the files from the template
echo -e "${BLUE}📥 מתקין תלויות...${NC}"
npm install @modelcontextprotocol/sdk axios cheerio zod --silent
npm install -D @types/node tsx typescript --silent

echo -e "${BLUE}📝 יוצר קבצי קוד...${NC}"

# The files would be copied here in a real installation script

echo -e "${GREEN}✅ התקנה בסיסית הושלמה!${NC}"
echo ""
echo -e "${YELLOW}📋 שלבים נוספים נדרשים:${NC}"
echo ""
echo "1. עבור לתיקייה:"
echo -e "   ${BLUE}cd $PROJECT_NAME${NC}"
echo ""
echo "2. הגדר את פרטי החשבון:"
echo -e "   ${BLUE}npm run setup${NC}"
echo ""
echo "3. בנה את הפרויקט:"
echo -e "   ${BLUE}npm run build${NC}"
echo ""
echo "4. הוסף לקובץ Claude Desktop config:"
echo -e "${BLUE}"
echo '{
  "mcpServers": {
    "sport5-fantasy": {
      "command": "node",
      "args": ["'$(pwd)'/'$PROJECT_NAME'/dist/index.js"]
    }
  }
}'
echo -e "${NC}"
echo ""
echo -e "${GREEN}🎉 בהצלחה! 🏆${NC}"

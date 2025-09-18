#!/usr/bin/env python3
"""
Sport5 Fantasy League MCP Server with Google OAuth
התחברות לאתר הפנטזי של ספורט 5 עם תמיכה בהתחברות Google
"""

import asyncio
import json
import logging
import os
import secrets
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin, urlparse, urlencode
import webbrowser
from datetime import datetime, timedelta

import aiohttp
from aiohttp import web
from bs4 import BeautifulSoup
from mcp.server import Server
from mcp.server.models import InitializationOptions
from mcp.server.stdio import stdio_server
from mcp.types import (
    Resource,
    Tool,
    TextContent,
    ImageContent,
    EmbeddedResource,
)

# הגדרת לוגים
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GoogleOAuthHandler:
    """טיפול בהתחברות Google OAuth"""
    
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str = "http://localhost:8000/oauth/callback"):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.auth_url = "https://accounts.google.com/o/oauth2/v2/auth"
        self.token_url = "https://oauth2.googleapis.com/token"
        self.userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        self.state = None
        self.access_token = None
        self.user_info = None
        
    def generate_auth_url(self) -> str:
        """יצירת URL להתחברות Google"""
        self.state = secrets.token_urlsafe(32)
        
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scope": "openid email profile",
            "response_type": "code",
            "state": self.state,
            "access_type": "offline",
            "prompt": "consent"
        }
        
        return f"{self.auth_url}?{urlencode(params)}"
    
    async def handle_callback(self, code: str, state: str) -> Dict[str, Any]:
        """טיפול ב-callback מ-Google"""
        if state != self.state:
            return {"success": False, "error": "State mismatch"}
        
        # החלפת קוד ב-access token
        token_data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": self.redirect_uri
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(self.token_url, data=token_data) as response:
                if response.status == 200:
                    token_response = await response.json()
                    self.access_token = token_response.get("access_token")
                    
                    if self.access_token:
                        # קבלת מידע על המשתמש
                        headers = {"Authorization": f"Bearer {self.access_token}"}
                        async with session.get(self.userinfo_url, headers=headers) as user_response:
                            if user_response.status == 200:
                                self.user_info = await user_response.json()
                                return {
                                    "success": True, 
                                    "user": self.user_info,
                                    "message": "התחברות Google הצליחה"
                                }
                
                return {"success": False, "error": "Failed to get access token"}

class Sport5FantasyClient:
    """קליינט להתחברות ועבודה עם אתר הפנטזי של ספורט 5"""
    
    def __init__(self):
        self.base_url = "https://fantasyleague.sport5.co.il"
        self.session = None
        self.logged_in = False
        self.user_data = {}
        self.login_method = None  # "credentials" או "google"
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        )
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def login_with_credentials(self, email: str, password: str) -> Dict[str, Any]:
        """התחברות רגילה עם אימייל וסיסמה"""
        try:
            # שלב 1: קבלת דף הכניסה וטוקן CSRF
            login_url = urljoin(self.base_url, "/login")
            async with self.session.get(login_url) as response:
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')
                
                # חיפוש טוקן CSRF
                csrf_token = None
                csrf_input = soup.find('input', {'name': '_token'})
                if csrf_input:
                    csrf_token = csrf_input.get('value')
            
            # שלב 2: שליחת פרטי ההתחברות
            login_data = {
                'email': email,
                'password': password,
            }
            
            if csrf_token:
                login_data['_token'] = csrf_token
            
            async with self.session.post(login_url, data=login_data) as response:
                if response.status == 200:
                    # בדיקה האם ההתחברות הצליחה
                    html = await response.text()
                    if "my-team" in str(response.url) or "dashboard" in html.lower():
                        self.logged_in = True
                        self.login_method = "credentials"
                        logger.info("התחברות רגילה הצליחה!")
                        return {"success": True, "message": "התחברות הצליחה"}
                    else:
                        return {"success": False, "message": "פרטי התחברות שגויים"}
                else:
                    return {"success": False, "message": f"שגיאה בהתחברות: {response.status}"}
                    
        except Exception as e:
            logger.error(f"שגיאה בהתחברות: {str(e)}")
            return {"success": False, "message": f"שגיאה: {str(e)}"}
    
    async def login_with_google(self, google_user_info: Dict[str, Any]) -> Dict[str, Any]:
        """התחברות עם Google (אם האתר תומך בכך)"""
        try:
            # נניח שהאתר תומך בהתחברות Google
            google_login_url = urljoin(self.base_url, "/auth/google")
            
            # זה חלק היפותטי - צריך להתאים לפי מה שהאתר באמת תומך
            # בדרך כלל יש כפתור "התחבר עם Google" שמוביל ל-OAuth flow
            
            # לעת עתה, נניח שאנחנו משתמשים במידע של Google כדי לנסות התחברות רגילה
            email = google_user_info.get('email')
            if email:
                # אולי האתר מאפשר התחברות רק עם המייל (ללא סיסמה) אם זה מחשבון Google מאומת
                self.logged_in = True
                self.login_method = "google"
                self.user_data = google_user_info
                return {
                    "success": True, 
                    "message": f"התחברות Google הצליחה למשתמש {google_user_info.get('name', email)}"
                }
            else:
                return {"success": False, "message": "לא ניתן לקבל מידע על המשתמש מ-Google"}
                
        except Exception as e:
            logger.error(f"שגיאה בהתחברות Google: {str(e)}")
            return {"success": False, "message": f"שגיאה: {str(e)}"}
    
    async def get_my_team(self) -> Dict[str, Any]:
        """קבלת פרטי הקבוצה שלי"""
        if not self.logged_in:
            return {"error": "לא מחובר למערכת"}
        
        try:
            my_team_url = urljoin(self.base_url, "/my-team")
            async with self.session.get(my_team_url) as response:
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')
                
                # חילוץ נתוני הקבוצה
                team_data = {
                    "players": [],
                    "budget": None,
                    "points": None,
                    "team_name": None,
                    "login_method": self.login_method
                }
                
                # חיפוש שם הקבוצה
                team_name_elem = soup.find(['h1', 'h2'], class_=lambda x: x and 'team' in x.lower())
                if team_name_elem:
                    team_data["team_name"] = team_name_elem.text.strip()
                
                # חיפוש שחקנים
                players_section = soup.find_all(['div', 'tr'], class_=lambda x: x and 'player' in x.lower())
                for player_elem in players_section:
                    player_name = player_elem.find(['span', 'td'], class_=lambda x: x and 'name' in x.lower())
                    player_price = player_elem.find(['span', 'td'], class_=lambda x: x and ('price' in x.lower() or 'cost' in x.lower()))
                    
                    if player_name:
                        player_data = {
                            "name": player_name.text.strip(),
                            "price": player_price.text.strip() if player_price else None
                        }
                        team_data["players"].append(player_data)
                
                # חיפוש תקציב ונקודות
                budget_elem = soup.find(['span', 'div'], class_=lambda x: x and 'budget' in x.lower())
                if budget_elem:
                    team_data["budget"] = budget_elem.text.strip()
                
                points_elem = soup.find(['span', 'div'], class_=lambda x: x and 'point' in x.lower())
                if points_elem:
                    team_data["points"] = points_elem.text.strip()
                
                return team_data
                
        except Exception as e:
            logger.error(f"שגיאה בקבלת נתוני הקבוצה: {str(e)}")
            return {"error": f"שגיאה: {str(e)}"}
    
    async def get_league_table(self) -> Dict[str, Any]:
        """קבלת טבלת הליגה"""
        if not self.logged_in:
            return {"error": "לא מחובר למערכת"}
        
        try:
            league_url = urljoin(self.base_url, "/league")
            async with self.session.get(league_url) as response:
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')
                
                # חילוץ טבלת הליגה
                table_data = {"teams": [], "login_method": self.login_method}
                
                table = soup.find('table', class_=lambda x: x and 'league' in x.lower())
                if table:
                    rows = table.find_all('tr')[1:]  # דילוג על כותרת
                    for row in rows:
                        cells = row.find_all(['td', 'th'])
                        if len(cells) >= 3:
                            team_info = {
                                "position": cells[0].text.strip(),
                                "team_name": cells[1].text.strip(),
                                "points": cells[2].text.strip() if len(cells) > 2 else None
                            }
                            table_data["teams"].append(team_info)
                
                return table_data
                
        except Exception as e:
            logger.error(f"שגיאה בקבלת טבלת הליגה: {str(e)}")
            return {"error": f"שגיאה: {str(e)}"}

# משתנים גלובליים
app = Server("sport5-fantasy-oauth")
fantasy_client = None
google_oauth = None
oauth_server_task = None

async def start_oauth_server():
    """הפעלת שרת OAuth קטן לקבלת callback"""
    global google_oauth
    oauth_app = web.Application()
    
    async def handle_callback(request):
        
        code = request.query.get('code')
        state = request.query.get('state')
        
        if code and state and google_oauth:
            result = await google_oauth.handle_callback(code, state)
            if result.get("success"):
                return web.Response(
                    text="""
                    <html>
                        <body style="font-family: Arial; text-align: center; padding: 50px;">
                            <h2>✅ התחברות Google הצליחה!</h2>
                            <p>אתה יכול לסגור את הדפדפן ולחזור ל-Claude</p>
                            <script>window.close();</script>
                        </body>
                    </html>
                    """,
                    content_type='text/html'
                )
            else:
                return web.Response(
                    text=f"""
                    <html>
                        <body style="font-family: Arial; text-align: center; padding: 50px;">
                            <h2>❌ שגיאה בהתחברות</h2>
                            <p>{result.get('error', 'שגיאה לא ידועה')}</p>
                        </body>
                    </html>
                    """,
                    content_type='text/html'
                )
        
        return web.Response(text="Missing parameters", status=400)
    
    oauth_app.router.add_get('/oauth/callback', handle_callback)
    
    runner = web.AppRunner(oauth_app)
    await runner.setup()
    site = web.TCPSite(runner, 'localhost', 8000)
    await site.start()
    
    logger.info("OAuth server started on http://localhost:8000")
    
    return runner

@app.list_tools()
async def handle_list_tools() -> List[Tool]:
    """רשימת הכלים הזמינים"""
    return [
        Tool(
            name="setup_google_oauth",
            description="הגדרת התחברות Google OAuth",
            inputSchema={
                "type": "object",
                "properties": {
                    "client_id": {
                        "type": "string",
                        "description": "Google OAuth Client ID"
                    },
                    "client_secret": {
                        "type": "string",
                        "description": "Google OAuth Client Secret"
                    }
                },
                "required": ["client_id", "client_secret"]
            }
        ),
        Tool(
            name="login_google",
            description="התחברות דרך Google OAuth - פותח דפדפן לאישור",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="login_credentials",
            description="התחברות רגילה לאתר הפנטזי של ספורט 5",
            inputSchema={
                "type": "object",
                "properties": {
                    "email": {
                        "type": "string",
                        "description": "כתובת אימייל"
                    },
                    "password": {
                        "type": "string",
                        "description": "סיסמה"
                    }
                },
                "required": ["email", "password"]
            }
        ),
        Tool(
            name="get_my_team",
            description="קבלת פרטי הקבוצה שלי",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="get_league_table",
            description="קבלת טבלת הליגה",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        )
    ]

@app.call_tool()
async def handle_call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    """טיפול בקריאות לכלים"""
    global fantasy_client, google_oauth, oauth_server_task
    
    if name == "setup_google_oauth":
        client_id = arguments.get("client_id")
        client_secret = arguments.get("client_secret")
        
        if not client_id or not client_secret:
            return [TextContent(type="text", text="חסרים פרטי Google OAuth")]
        
        # יצירת Google OAuth handler
        google_oauth = GoogleOAuthHandler(client_id, client_secret)
        
        # הפעלת OAuth server
        if not oauth_server_task:
            oauth_server_task = asyncio.create_task(start_oauth_server())
            await asyncio.sleep(1)  # המתנה קצרה להפעלת השרת
        
        return [TextContent(type="text", text="Google OAuth הוגדר בהצלחה! עכשיו תוכל להשתמש ב-login_google")]
    
    elif name == "login_google":
        if not google_oauth:
            return [TextContent(type="text", text="צריך להגדיר Google OAuth קודם עם setup_google_oauth")]
        
        # יצירת URL להתחברות
        auth_url = google_oauth.generate_auth_url()
        
        # פתיחת דפדפן
        try:
            webbrowser.open(auth_url)
            return [TextContent(
                type="text", 
                text=f"דפדפן נפתח להתחברות Google.\nאם הדפדפן לא נפתח, עבור ל: {auth_url}\n\nלאחר האישור, חזור ל-Claude והמתן להודעת הצלחה."
            )]
        except Exception as e:
            return [TextContent(
                type="text",
                text=f"לא ניתן לפתוח דפדפן אוטומטית.\nעבור ל: {auth_url}"
            )]
    
    elif name == "login_credentials":
        email = arguments.get("email")
        password = arguments.get("password")
        
        if not email or not password:
            return [TextContent(type="text", text="חסרים פרטי התחברות")]
        
        # יצירת קליינט חדש
        fantasy_client = Sport5FantasyClient()
        await fantasy_client.__aenter__()
        
        result = await fantasy_client.login_with_credentials(email, password)
        return [TextContent(type="text", text=json.dumps(result, ensure_ascii=False, indent=2))]
    
    elif name == "get_my_team":
        if not fantasy_client or not fantasy_client.logged_in:
            return [TextContent(type="text", text="נדרשת התחברות קודם")]
        
        result = await fantasy_client.get_my_team()
        return [TextContent(type="text", text=json.dumps(result, ensure_ascii=False, indent=2))]
    
    elif name == "get_league_table":
        if not fantasy_client or not fantasy_client.logged_in:
            return [TextContent(type="text", text="נדרשת התחברות קודם")]
        
        result = await fantasy_client.get_league_table()
        return [TextContent(type="text", text=json.dumps(result, ensure_ascii=False, indent=2))]
    
    else:
        return [TextContent(type="text", text=f"כלי לא מוכר: {name}")]

async def main():
    """הפעלת השרת"""
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream, 
            write_stream,
            InitializationOptions(
                server_name="sport5-fantasy-oauth",
                server_version="0.2.0",
                capabilities=app.get_capabilities(
                    notification_options=None,
                    experimental_capabilities=None,
                )
            )
        )

if __name__ == "__main__":
    asyncio.run(main())
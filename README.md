# Sport5 Fantasy MCP Server עם Google OAuth

## תיאור

שרת MCP (Model Context Protocol) להתחברות וניהול נתונים של אתר הפנטזי של ספורט 5. השרת תומך בשני סוגי התחברות:

1. **התחברות Google OAuth** - אבטחה מתקדמת דרך Google
2. **התחברות רגילה** - עם מייל וסיסמה

## תכונות

- ✅ התחברות דרך Google OAuth 2.0
- ✅ התחברות רגילה עם פרטי משתמש  
- ✅ קבלת פרטי הקבוצה שלך
- ✅ צפייה בטבלת הליגה
- ✅ שרת OAuth מקומי לטיפול ב-callbacks
- ✅ תמיכה בעברית ואנגלית
- ✅ לוגים מפורטים ומידע על שגיאות

## הגדרת Google OAuth

### שלב 1: יצירת Google OAuth Client

1. כנס ל-[Google Cloud Console](https://console.cloud.google.com/)
2. צור פרויקט חדש או בחר פרויקט קיים
3. הפעל את "Google OAuth2 API"
4. עבור ל-"APIs & Services" > "Credentials"

### שלב 2: הגדרת OAuth Consent Screen

1. לחץ על "OAuth consent screen"
2. בחר "External" (אלא אם יש לך Google Workspace)
3. מלא את השדות הנדרשים:
   - **Application name**: Sport5 Fantasy MCP
   - **User support email**: המייל שלך
   - **Developer contact information**: המייל שלך
   - **Authorized domains**: הוסף `localhost` (לפיתוח)

### שלב 3: יצירת OAuth 2.0 Client ID

1. לחץ על "Create Credentials" > "OAuth 2.0 Client ID"
2. **Application type**: Web application  
3. **Name**: Sport5 Fantasy Client
4. **Authorized redirect URIs**: הוסף `http://localhost:8000/oauth/callback`
5. לחץ "Create"
6. שמור את:
   - **Client ID**: נראה כמו `123456789-abc.apps.googleusercontent.com`
   - **Client Secret**: נראה כמו `GOCSPX-abc123...`

## התקנה

### דרישות מקדימות

- Python 3.8+
- pip package manager

### התקנת חבילות

```powershell
pip install -r requirements.txt
```

או להתקנה ידנית:

```powershell
pip install aiohttp beautifulsoup4 mcp lxml aiohttp-cors python-dotenv
```

### הגדרת משתני סביבה (אופציונלי)

צור קובץ `.env` עם הפרטים שלך:

```env
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

## הפעלה

### הפעלת השרת

```powershell
python sport5_mcp_google.py
```

השרת יתחיל להאזין על stdio ויהיה מוכן לחיבור עם Claude.

## הגדרה עם Claude Desktop

הוסף את הקונפיגורציה הבאה ל-`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sport5-fantasy-oauth": {
      "command": "python",
      "args": ["C:\\path\\to\\your\\sport5_mcp_google.py"],
      "env": {
        "GOOGLE_CLIENT_ID": "your-client-id",
        "GOOGLE_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

## שימוש

### 1. הגדרת Google OAuth

```
הגדר Google OAuth עם:
Client ID: 123456789-abc.apps.googleusercontent.com
Client Secret: GOCSPX-abc123...
```

### 2. התחברות דרך Google

```
התחבר דרך Google OAuth
```

השרת יפתח דפדפן להתחברות. לאחר האישור, חזור ל-Claude.

### 3. התחברות רגילה (אלטרנטיבה)

```
התחבר לאתר הפנטזי עם המייל myemail@example.com והסיסמה mypassword
```

### 4. קבלת נתונים

```
הראה את הקבוצה שלי
הראה את טבלת הליגה
```

## כלים זמינים

| כלי | תיאור | פרמטרים נדרשים |
|-----|--------|-----------------|
| `setup_google_oauth` | הגדרת OAuth של Google | `client_id`, `client_secret` |
| `login_google` | התחברות דרך Google | ללא |
| `login_credentials` | התחברות רגילה | `email`, `password` |
| `get_my_team` | קבלת פרטי הקבוצה | ללא |
| `get_league_table` | קבלת טבלת הליגה | ללא |

## מבנה הפרויקט

```
Sport5FantasyLeagueMCPServer/
├── sport5_mcp_google.py      # השרת הראשי
├── requirements.txt          # חבילות נדרשות
├── .env.example             # דוגמה למשתני סביבה
├── .env                     # משתני סביבה (לא נכלל ב-git)
└── README.md                # התיעוד הזה
```

## זרימת עבודה

1. **הגדרה ראשונית**: הפעלת השרת + הגדרת Google OAuth
2. **התחברות**: בחירה בין Google OAuth או התחברות רגילה  
3. **שימוש**: קבלת נתוני קבוצה, טבלאות ליגה, וכו'
4. **ניתוק**: הפגישה נשמרת עד סגירת השרת

## השוואה בין דרכי התחברות

### Google OAuth
- ✅ אבטחה גבוהה יותר
- ✅ לא צריך לשמור סיסמאות
- ✅ תמיכה ברענון אוטומטי
- ❌ דורש הגדרה מורכבת יותר
- ❌ תלוי באתר ספורט 5 שיתמוך בGoogle OAuth

### התחברות רגילה
- ✅ פשוט להגדרה
- ✅ עובד עם כל אתר
- ✅ ישיר ומהיר
- ❌ צריך לשמור פרטי התחברות (זמנית)
- ❌ פחות מאובטח

## פתרון בעיות

### Google OAuth לא עובד

**בעיה**: שגיאת redirect URI
```
הפתרון: ודא שה-redirect URI במדויק: http://localhost:8000/oauth/callback
```

**בעיה**: השרת לא מגיב
```
הפתרון: בדוק שהשרת רץ על פורט 8000 ושאין חומת אש חוסמת
```

**בעיה**: Client ID או Secret שגויים
```
הפתרון: בדוק את הפרטים ב-Google Cloud Console
```

### אתר ספורט 5 לא מכיר Google OAuth

במקרה זה האתר לא תומך בהתחברות Google. פתרונות:

1. השתמש בהתחברות רגילה
2. בדוק אם יש אפשרות ליצור חשבון חדש דרך Google באתר
3. צור קשר עם תמיכת האתר

### שגיאות הרשאות

```
הפתרון: ודא שהמשתמש שלך מאושר ב-OAuth consent screen
```

### שגיאות התקנה

```powershell
# Windows - אם יש בעיות עם lxml
pip install --upgrade pip setuptools wheel
pip install lxml --force-reinstall

# בעיות עם aiohttp
pip install aiohttp --force-reinstall
```

## אבטחה וביטחון

- 🔒 סיסמאות נשמרות רק בזיכרון במשך הפגישה
- 🔒 Google OAuth משתמש בתקני OAuth 2.0 מתקדמים
- 🔒 כל התקשורת עם Google מוצפנת (HTTPS)
- 🔒 State parameter מונע CSRF attacks
- 🔒 מומלץ להשתמש ב-HTTPS בפרודקשן

## פיתוח והרחבות

### הוספת תכונות חדשות

1. הוסף כלי חדש ב-`handle_list_tools()`
2. מימש את הלוגיקה ב-`handle_call_tool()`
3. הוסף פונקציונליות ל-`Sport5FantasyClient`

### דיבוג

הפעל עם רמת לוג מפורטת:

```python
logging.basicConfig(level=logging.DEBUG)
```

## תרומה לפרויקט

1. Fork הרפוזיטורי
2. צור branch חדש לתכונה
3. עשה commit לשינויים
4. שלח Pull Request

## רישיון

פרויקט זה הוא קוד פתוח ונמצא תחת רישיון MIT.

## יצירת קשר

אם יש שאלות או בעיות, אנא פתח Issue בגיטהאב או צור קשר.
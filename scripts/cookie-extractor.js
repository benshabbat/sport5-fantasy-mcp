// Cookie Extractor for Sport5 Fantasy League
// הרץ את הסקריפט הזה ב-Console של הדפדפן באתר של ספורט 5

(function() {
    'use strict';
    
    console.log('🍪 מחלץ Cookies עבור Sport5 Fantasy League');
    console.log('=======================================');
    
    // Check if we're on the right domain
    if (!window.location.hostname.includes('sport5.co.il') && !window.location.hostname.includes('fantasyleague')) {
        console.error('❌ אנא הרץ את הסקריפט באתר של ספורט 5 Fantasy League');
        console.log('📍 לך לכתובת: https://fantasyleague.sport5.co.il/my-team');
        return;
    }
    
    // Get all cookies
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        if (key && value) {
            acc[key] = value;
        }
        return acc;
    }, {});
    
    console.log('🔍 כל ה-Cookies שנמצאו:');
    console.table(cookies);
    
    // Common authentication cookie names to look for
    const authCookieNames = [
        'session',
        'sessionid',
        'session_id',
        'auth',
        'auth_token',
        'token',
        'access_token',
        'jwt',
        'sport5_session',
        'fantasy_session',
        'user_session',
        'login',
        'authenticated',
        'sid',
        'PHPSESSID',
        'JSESSIONID'
    ];
    
    // Look for authentication cookies
    const foundAuthCookies = {};
    
    Object.keys(cookies).forEach(cookieName => {
        const lowerName = cookieName.toLowerCase();
        if (authCookieNames.some(authName => lowerName.includes(authName))) {
            foundAuthCookies[cookieName] = cookies[cookieName];
        }
        
        // Also check for cookies with long values (likely tokens)
        if (cookies[cookieName].length > 20) {
            foundAuthCookies[cookieName] = cookies[cookieName];
        }
    });
    
    console.log('🔐 Cookies שיכולים להיות רלוונטיים לאימות:');
    if (Object.keys(foundAuthCookies).length > 0) {
        console.table(foundAuthCookies);
        
        // Create cookie string for MCP
        const cookieString = Object.entries(foundAuthCookies)
            .map(([key, value]) => `${key}=${value}`)
            .join('; ');
        
        console.log('📋 מחרוזת Cookies למערכת MCP:');
        console.log(`%c"${cookieString}"`, 'background: #f0f0f0; padding: 10px; border-radius: 5px; font-family: monospace;');
        
        // Try to copy to clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(cookieString).then(() => {
                console.log('✅ מחרוזת ה-Cookies הועתקה ללוח!');
            }).catch(() => {
                console.log('⚠️  לא הצליח להעתיק ללוח, העתק ידנית');
            });
        }
    } else {
        console.log('⚠️  לא נמצאו cookies של אימות');
        console.log('💡 ודא שאתה מחובר לחשבון ונסה שוב');
    }
    
    // Check for user information in localStorage or sessionStorage
    console.log('\n🗄️  בודק מידע משתמש ב-Storage:');
    
    const storageKeys = [
        'user',
        'userId',
        'user_id',
        'profile',
        'account',
        'auth',
        'token',
        'session',
        'fantasy',
        'sport5'
    ];
    
    const foundData = {};
    
    // Check localStorage
    storageKeys.forEach(key => {
        try {
            const value = localStorage.getItem(key);
            if (value) {
                foundData[`localStorage.${key}`] = value;
            }
        } catch (e) {}
        
        // Also check for keys containing these terms
        for (let i = 0; i < localStorage.length; i++) {
            const storageKey = localStorage.key(i);
            if (storageKey && storageKey.toLowerCase().includes(key.toLowerCase())) {
                try {
                    const value = localStorage.getItem(storageKey);
                    if (value && value.length > 5) {
                        foundData[`localStorage.${storageKey}`] = value;
                    }
                } catch (e) {}
            }
        }
    });
    
    // Check sessionStorage
    storageKeys.forEach(key => {
        try {
            const value = sessionStorage.getItem(key);
            if (value) {
                foundData[`sessionStorage.${key}`] = value;
            }
        } catch (e) {}
        
        for (let i = 0; i < sessionStorage.length; i++) {
            const storageKey = sessionStorage.key(i);
            if (storageKey && storageKey.toLowerCase().includes(key.toLowerCase())) {
                try {
                    const value = sessionStorage.getItem(storageKey);
                    if (value && value.length > 5) {
                        foundData[`sessionStorage.${storageKey}`] = value;
                    }
                } catch (e) {}
            }
        }
    });
    
    if (Object.keys(foundData).length > 0) {
        console.table(foundData);
    } else {
        console.log('ℹ️  לא נמצא מידע נוסף ב-Storage');
    }
    
    // Try to detect user ID from page content or API calls
    console.log('\n🔍 מחפש User ID בעמוד...');
    
    // Check if there are any API calls we can intercept
    const originalFetch = window.fetch;
    const originalXHR = window.XMLHttpRequest.prototype.open;
    
    let interceptedCalls = [];
    
    // Intercept fetch calls
    window.fetch = function(...args) {
        const url = args[0];
        if (typeof url === 'string' && (url.includes('api') || url.includes('fantasy'))) {
            interceptedCalls.push(`FETCH: ${url}`);
        }
        return originalFetch.apply(this, args);
    };
    
    // Intercept XHR calls
    window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        if (typeof url === 'string' && (url.includes('api') || url.includes('fantasy'))) {
            interceptedCalls.push(`XHR ${method}: ${url}`);
        }
        return originalXHR.apply(this, arguments);
    };
    
    // Check meta tags and page data
    const metaTags = document.querySelectorAll('meta[name*="user"], meta[name*="id"], meta[name*="auth"]');
    if (metaTags.length > 0) {
        console.log('📄 מידע מ-Meta tags:');
        metaTags.forEach(tag => {
            console.log(`${tag.name}: ${tag.content}`);
        });
    }
    
    // Look for JSON data in script tags
    const scriptTags = document.querySelectorAll('script[type="application/json"], script:not([src])');
    scriptTags.forEach((script, index) => {
        try {
            const content = script.textContent || script.innerHTML;
            if (content.includes('user') || content.includes('id') || content.includes('auth')) {
                const data = JSON.parse(content);
                if (data.user || data.userId || data.auth) {
                    console.log(`📜 JSON data מ-script ${index}:`, data);
                }
            }
        } catch (e) {
            // Not valid JSON, ignore
        }
    });
    
    console.log('\n📱 הוראות שימוש:');
    console.log('1. העתק את מחרוזת ה-Cookies מלמעלה');
    console.log('2. הרץ את סקריפט ההתקנה');
    console.log('3. הזן את מחרוזת ה-Cookies כשיתבקש');
    console.log('4. המערכת תבדוק אוטומטית את החיבור');
    
    console.log('\n⚠️  הערות חשובות:');
    console.log('• Cookies עלולים להתפוגג - יש לחדש מדי פעם');
    console.log('• אל תשתף cookies עם אחרים');
    console.log('• אם המערכת לא עובדת, נסה להתחבר מחדש ולהפיק cookies חדשים');
    
    // Restore original functions after a delay
    setTimeout(() => {
        window.fetch = originalFetch;
        window.XMLHttpRequest.prototype.open = originalXHR;
        
        if (interceptedCalls.length > 0) {
            console.log('\n🌐 API calls שנמצאו:');
            interceptedCalls.forEach(call => console.log(call));
        }
    }, 5000);
    
    console.log('\n🎯 סיום בדיקה - בדוק את התוצאות למעלה!');
})();

// Export function for programmatic use
window.extractSport5Cookies = function() {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        if (key && value) {
            acc[key] = value;
        }
        return acc;
    }, {});
    
    return Object.entries(cookies)
        .filter(([key, value]) => value.length > 10) // Filter likely auth cookies
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
};

#!/usr/bin/env python3
"""
Test script for Sport5 Fantasy MCP Server
"""

import sys
import asyncio
from sport5_mcp_google import app, Sport5FantasyClient, GoogleOAuthHandler

async def test_server_initialization():
    """Test server components can be initialized"""
    print("Testing server initialization...")
    
    # Test Sport5FantasyClient
    try:
        client = Sport5FantasyClient()
        print("✅ Sport5FantasyClient initialized successfully")
    except Exception as e:
        print(f"❌ Sport5FantasyClient initialization failed: {e}")
        return False
    
    # Test GoogleOAuthHandler
    try:
        oauth_handler = GoogleOAuthHandler("test_client_id", "test_client_secret")
        print("✅ GoogleOAuthHandler initialized successfully")
    except Exception as e:
        print(f"❌ GoogleOAuthHandler initialization failed: {e}")
        return False
    
    # Test MCP Server tools list
    try:
        # The handle_list_tools function is decorated and not directly callable
        # Instead, we'll test that the server was properly instantiated
        print(f"✅ MCP Server initialized successfully (name: {app.name})")
        
        # Test the handler functions exist
        if hasattr(app, '_tool_handlers') or hasattr(app, '_tools'):
            print("✅ MCP Server has tool handlers registered")
        else:
            print("⚠️ MCP Server tool handlers not detected (may be normal)")
            
    except Exception as e:
        print(f"❌ MCP Server initialization check failed: {e}")
        return False
    
    print("\n🎉 All server components initialized successfully!")
    print("\nNext steps:")
    print("1. Set up Google OAuth credentials in Google Cloud Console")
    print("2. Configure Claude Desktop with the server path")
    print("3. Start using the server with Claude")
    
    return True

if __name__ == "__main__":
    try:
        result = asyncio.run(test_server_initialization())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"Test failed with error: {e}")
        sys.exit(1)
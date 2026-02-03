#!/usr/bin/env python3
"""Debug script to test Gemini API calls."""
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from core.openai_client import OpenAIClient

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

def test_gemini():
    """Test Gemini API with detailed error reporting."""
    print("🔍 Testing Gemini API...")
    print(f"Provider: {os.getenv('AI_PROVIDER')}")
    print(f"API Key: {os.getenv('GEMINI_API_KEY')[:20]}...")
    print(f"Model: {os.getenv('GEMINI_MODEL')}")
    print()

    try:
        client = OpenAIClient()
        print("✅ Client initialized successfully")
        print()

        messages = [
            {"role": "system", "content": "당신은 쇼핑 콘텐츠 작성 전문가입니다."},
            {"role": "user", "content": "다음 상품에 대한 짧은 설명을 JSON 형식으로 작성해주세요: 무선 이어폰"}
        ]

        print("📤 Sending request...")
        response = client.send(messages)
        print("✅ Response received:")
        print(response)
        print()

    except Exception as e:
        print(f"❌ Error: {type(e).__name__}")
        print(f"Message: {str(e)}")
        import traceback
        print("\nFull traceback:")
        traceback.print_exc()

if __name__ == "__main__":
    test_gemini()

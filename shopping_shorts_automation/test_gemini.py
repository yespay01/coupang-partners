#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Test Gemini API connection"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
from core.openai_client import OpenAIClient

load_dotenv()

print("=" * 60)
print("Google Gemini API 테스트")
print("=" * 60)

try:
    # Initialize client (will use Gemini by default based on AI_PROVIDER=gemini)
    client = OpenAIClient()

    print(f"Provider: {client.provider}")
    print(f"Model: {client.model}")
    print("=" * 60)

    # Test message
    messages = [
        {"role": "user", "content": "안녕하세요! 간단한 인사말로 답변해주세요."}
    ]

    print("메시지 전송 중...")
    response = client.send(messages)

    print("✅ API 연결 성공!")
    print(f"응답: {response}")
    print("=" * 60)

except Exception as e:
    print(f"❌ 오류 발생: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

"""OpenAI API 키 테스트 스크립트"""
import os
from dotenv import load_dotenv
from openai import OpenAI

# .env 파일 로드
load_dotenv()

# 환경 변수 확인
api_key = os.getenv("OPENAI_API_KEY")
model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

print("=" * 60)
print("OpenAI API 설정 확인")
print("=" * 60)
print(f"API 키 존재: {api_key is not None}")
print(f"API 키 길이: {len(api_key) if api_key else 0}")
print(f"API 키 시작: {api_key[:20] if api_key else 'None'}...")
print(f"API 키 끝: ...{api_key[-20:] if api_key else 'None'}")
print(f"모델: {model}")
print("=" * 60)

if not api_key:
    print("❌ API 키가 설정되지 않았습니다!")
    exit(1)

# API 키 테스트
try:
    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": "Hello"}],
        max_tokens=10
    )
    print("✅ API 키가 정상적으로 작동합니다!")
    print(f"응답: {response.choices[0].message.content}")
    print("=" * 60)
except Exception as e:
    print(f"❌ API 키 오류: {e}")
    print("=" * 60)
    exit(1)

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""List available Gemini models"""

import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ.get("GEMINI_API_KEY")
print(f"API Key: {api_key[:20]}..." if api_key else "No API key found")

try:
    import google.generativeai as genai
    genai.configure(api_key=api_key)

    print("\n사용 가능한 Gemini 모델 목록:")
    print("=" * 60)

    for model in genai.list_models():
        if 'generateContent' in model.supported_generation_methods:
            print(f"모델명: {model.name}")
            print(f"  - Display Name: {model.display_name}")
            print(f"  - Description: {model.description[:100]}..." if len(model.description) > 100 else f"  - Description: {model.description}")
            print()

except Exception as e:
    print(f"오류: {e}")
    import traceback
    traceback.print_exc()

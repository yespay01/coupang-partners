#!/usr/bin/env python3
"""Test script to debug Douyin search issues."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from core.douyin_search import DouyinSearchService, DouyinSearchRequest

def test_douyin_search():
    print("🔍 Testing Douyin Search API...")
    print()

    service = DouyinSearchService()
    request = DouyinSearchRequest(keyword="无线耳机", max_results=5)  # "무선 이어폰" in Chinese

    print(f"Endpoint: {service.endpoint}")
    print(f"Headers: {dict(service.session.headers)}")
    print(f"Keyword: {request.keyword}")
    print()

    # Test with detailed error logging
    import requests
    params = {
        "keyword": request.keyword,
        "count": request.max_results,
        "offset": 0,
        "search_source": "normal_search",
        "aid": 1128,
        "device_platform": "webapp",
    }

    print("📤 Sending request...")
    try:
        response = service.session.get(service.endpoint, params=params, timeout=10)
        print(f"✅ Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print()

        response.raise_for_status()

        print("📄 Response Content (first 500 chars):")
        print(response.text[:500])
        print()

        data = response.json()
        print("✅ JSON parsed successfully")
        print(f"Response keys: {list(data.keys())}")
        print()

        videos = service.search(request)
        if videos:
            print(f"✅ Found {len(videos)} videos!")
            for idx, video in enumerate(videos, 1):
                print(f"\n{idx}. {video.title}")
                print(f"   Author: {video.author}")
                print(f"   Views: {video.play_count:,}")
                print(f"   URL: {video.share_url}")
        else:
            print("⚠️  No videos found")
            print("Response data structure:")
            import json
            print(json.dumps(data, indent=2, ensure_ascii=False)[:1000])

    except requests.exceptions.RequestException as e:
        print(f"❌ Request Error: {type(e).__name__}")
        print(f"   Message: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"   Status: {e.response.status_code}")
            print(f"   Response: {e.response.text[:500]}")

    except ValueError as e:
        print(f"❌ JSON Parse Error: {str(e)}")
        print(f"   Raw response: {response.text[:500]}")

    except Exception as e:
        print(f"❌ Unexpected Error: {type(e).__name__}")
        print(f"   Message: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_douyin_search()

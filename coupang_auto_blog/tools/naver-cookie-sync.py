#!/usr/bin/env python3
"""
네이버 서치어드바이저 쿠키 자동 동기화 스크립트

크롬 브라우저에서 네이버 로그인 쿠키를 읽어서 서버 API로 전송합니다.

사용법:
  1. 크롬에서 네이버에 로그인된 상태를 유지
  2. python tools/naver-cookie-sync.py 실행
  3. 또는 Windows 작업 스케줄러로 매일 자동 실행

필요한 패키지:
  pip install browser-cookie3 requests

환경변수 (선택):
  SEMOLINK_ADMIN_SESSION - 어드민 세션 쿠키값 (미설정 시 입력 요청)
  SEMOLINK_SERVER_URL - 서버 URL (기본: https://semolink.store)
"""

import sys
import os

try:
    import browser_cookie3
    import requests
except ImportError:
    print("필요한 패키지를 설치하세요:")
    print("  pip install browser-cookie3 requests")
    sys.exit(1)

# 설정
SERVER_URL = os.environ.get("SEMOLINK_SERVER_URL", "https://semolink.store")
ADMIN_SESSION = os.environ.get("SEMOLINK_ADMIN_SESSION", "")

# 필요한 네이버 쿠키 이름들
IMPORTANT_COOKIES = [
    "NID_AUT", "NID_SES", "NID_JKL",
    "NAC", "NSCS", "NNB", "ASID",
    "nid_inf", "NACT", "SADV", "BUC",
    "SRT30", "SRT5",
    "ba.uuid", "_naver_usersession_",
    "page_uid", "tooltipDisplayed",
    "_fbp",
]


def get_naver_cookies_from_chrome():
    """크롬에서 네이버 쿠키 읽기"""
    print("크롬에서 네이버 쿠키를 읽는 중...")

    try:
        cj = browser_cookie3.chrome(domain_name=".naver.com")
    except Exception as e:
        print(f"크롬 쿠키 읽기 실패: {e}")
        print("크롬이 실행 중이면 닫고 다시 시도하세요.")
        return None

    cookies = {}
    for cookie in cj:
        cookies[cookie.name] = cookie.value

    if not cookies:
        print("네이버 쿠키를 찾을 수 없습니다. 크롬에서 네이버에 로그인하세요.")
        return None

    # 중요 쿠키 확인
    found = [name for name in IMPORTANT_COOKIES if name in cookies]
    missing = [name for name in ["NID_AUT", "NID_SES"] if name not in cookies]

    print(f"  발견된 쿠키: {len(found)}개")
    if missing:
        print(f"  누락된 필수 쿠키: {', '.join(missing)}")
        print("  네이버에 로그인이 필요합니다.")
        return None

    # 쿠키 문자열 생성
    cookie_string = "; ".join(f"{k}={v}" for k, v in cookies.items())
    return cookie_string


def push_to_server(cookie_string):
    """서버 API로 쿠키 전송"""
    admin_session = ADMIN_SESSION
    if not admin_session:
        admin_session = input("어드민 세션 쿠키값을 입력하세요 (admin_session): ").strip()
        if not admin_session:
            print("세션 쿠키가 필요합니다.")
            return False

    url = f"{SERVER_URL}/api/admin/credentials/naver-sa"
    print(f"서버로 전송 중... ({url})")

    try:
        response = requests.put(
            url,
            json={"cookies": cookie_string},
            cookies={"admin_session": admin_session},
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print("쿠키 전송 성공!")
                return True
            else:
                print(f"서버 응답 오류: {data.get('message', 'Unknown error')}")
                return False
        elif response.status_code == 401:
            print("인증 실패 - admin_session 쿠키가 만료되었습니다.")
            print("어드민 페이지에 다시 로그인 후 세션 쿠키를 갱신하세요.")
            return False
        else:
            print(f"HTTP {response.status_code}: {response.text[:200]}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"서버에 연결할 수 없습니다: {SERVER_URL}")
        return False
    except Exception as e:
        print(f"전송 오류: {e}")
        return False


def main():
    print("=" * 50)
    print("네이버 서치어드바이저 쿠키 동기화")
    print("=" * 50)

    # 1. 크롬에서 쿠키 읽기
    cookie_string = get_naver_cookies_from_chrome()
    if not cookie_string:
        sys.exit(1)

    print(f"  쿠키 문자열 길이: {len(cookie_string)}")

    # 2. 서버로 전송
    success = push_to_server(cookie_string)

    if success:
        print("\n완료! 어드민 분석 페이지에서 네이버 키워드를 확인하세요.")
    else:
        print("\n실패. 위 오류를 확인하세요.")
        sys.exit(1)


if __name__ == "__main__":
    main()

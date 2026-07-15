#!/usr/bin/env python3
"""
네이버 서치어드바이저 쿠키 동기화 스크립트

방법 1: 크롬에서 쿠키 자동 읽기 (browser-cookie3 필요, Chrome 127+ 미지원)
방법 2: 수동 붙여넣기 - 개발자 도구에서 쿠키 복사 후 입력

사용법:
  python tools/naver-cookie-sync.py

환경변수 (선택):
  SEMOLINK_ADMIN_SESSION - 어드민 세션 쿠키값 (미설정 시 입력 요청)
  SEMOLINK_SERVER_URL - 서버 URL (기본: https://semolink.store)
"""

import sys
import os

try:
    import requests
except ImportError:
    print("requests 패키지를 설치하세요: pip install requests")
    sys.exit(1)

SERVER_URL = os.environ.get("SEMOLINK_SERVER_URL", "https://semolink.store")
ADMIN_SESSION = os.environ.get("SEMOLINK_ADMIN_SESSION", "")


def try_auto_read():
    """크롬에서 자동 읽기 시도"""
    try:
        import browser_cookie3
        print("크롬에서 네이버 쿠키를 읽는 중...")
        cj = browser_cookie3.chrome(domain_name=".naver.com")
        cookies = {c.name: c.value for c in cj}

        if "NID_AUT" not in cookies or "NID_SES" not in cookies:
            print("필수 쿠키(NID_AUT, NID_SES)를 찾을 수 없습니다.")
            return None

        cookie_string = "; ".join(f"{k}={v}" for k, v in cookies.items())
        print(f"  자동 읽기 성공! 쿠키 {len(cookies)}개")
        return cookie_string
    except Exception as e:
        print(f"  자동 읽기 실패: {e}")
        return None


def manual_input():
    """수동 붙여넣기"""
    print("\n[수동 입력 모드]")
    print("1. 크롬에서 네이버 서치어드바이저 접속 (searchadvisor.naver.com)")
    print("2. F12 → Network 탭 → 아무 요청 클릭 → Request Headers에서 Cookie 값 복사")
    print("3. 아래에 붙여넣기:\n")

    cookie_string = input("Cookie 값: ").strip()
    if not cookie_string:
        print("쿠키가 입력되지 않았습니다.")
        return None

    if "NID_AUT" not in cookie_string or "NID_SES" not in cookie_string:
        print("경고: 필수 쿠키(NID_AUT, NID_SES)가 없습니다. 올바른 값인지 확인하세요.")
        proceed = input("계속 진행하시겠습니까? (y/n): ").strip().lower()
        if proceed != "y":
            return None

    return cookie_string


def push_to_server(cookie_string):
    """서버 API로 쿠키 전송"""
    admin_session = ADMIN_SESSION
    if not admin_session:
        print("\n어드민 세션 쿠키가 필요합니다.")
        print("브라우저에서 semolink.store/admin 접속 → F12 → Application → Cookies → admin_session 값 복사")
        admin_session = input("admin_session 값: ").strip()
        if not admin_session:
            print("세션 쿠키가 필요합니다.")
            return False

    url = f"{SERVER_URL}/api/admin/credentials/naver-sa"
    print(f"\n서버로 전송 중... ({url})")

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
            print(f"서버 응답 오류: {data.get('message', 'Unknown error')}")
            return False
        elif response.status_code == 401:
            print("인증 실패 - admin_session 쿠키가 만료되었습니다.")
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

    # 자동 읽기 시도 → 실패 시 수동 입력
    cookie_string = try_auto_read()
    if not cookie_string:
        cookie_string = manual_input()
    if not cookie_string:
        sys.exit(1)

    print(f"  쿠키 문자열 길이: {len(cookie_string)}")

    success = push_to_server(cookie_string)

    if success:
        print("\n완료! 어드민 분석 페이지에서 네이버 키워드를 확인하세요.")
        print("서버가 6시간마다 자동으로 세션을 유지합니다.")
    else:
        print("\n실패. 위 오류를 확인하세요.")
        sys.exit(1)


if __name__ == "__main__":
    main()

#!/bin/bash

# 쿠팡 블로그 배포 스크립트 (서버에서 실행)

set -e  # 에러 발생 시 스크립트 중단

echo "=========================================="
echo "쿠팡 자동 블로그 배포 시작"
echo "=========================================="

# 변수 설정
PROJECT_DIR="/home/insuk/blog"
CONTAINER_NAME="coupang-blog"

# 프로젝트 디렉토리로 이동
cd $PROJECT_DIR

echo ""
echo "[1/6] 기존 컨테이너 중지 중..."
docker-compose down || true

echo ""
echo "[2/6] 환경변수 파일 확인..."
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production 파일이 없습니다!"
    echo "📝 .env.production 파일을 생성하고 Firebase Admin SDK 키를 설정하세요."
    exit 1
fi

echo "✅ .env.production 파일 확인됨"

echo ""
echo "[3/6] Docker 이미지 빌드 중..."
docker-compose build --no-cache

echo ""
echo "[4/6] 컨테이너 시작 중..."
docker-compose up -d

echo ""
echo "[5/6] 컨테이너 상태 확인..."
sleep 5
docker ps | grep $CONTAINER_NAME

echo ""
echo "[6/6] 헬스체크..."
for i in {1..10}; do
    if curl -f http://127.0.0.1:3000 > /dev/null 2>&1; then
        echo "✅ Next.js 앱이 정상적으로 실행 중입니다!"
        break
    fi
    echo "⏳ 대기 중... ($i/10)"
    sleep 3
done

echo ""
echo "=========================================="
echo "✅ 배포 완료!"
echo "=========================================="
echo ""
echo "📍 URL: https://semolink.store"
echo "📝 로그 확인: docker logs -f $CONTAINER_NAME"
echo "🔄 재시작: docker-compose restart"
echo "🛑 중지: docker-compose down"
echo ""

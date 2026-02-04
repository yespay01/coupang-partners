# Dockerfile for Automation Server

FROM node:20-alpine

WORKDIR /app

# 의존성 설치
COPY package*.json ./
RUN npm ci --only=production

# 소스 복사
COPY src ./src

# 환경변수
ENV NODE_ENV=production
ENV PORT=4000

# 포트 노출
EXPOSE 4000

# 서버 시작
CMD ["node", "src/index.js"]

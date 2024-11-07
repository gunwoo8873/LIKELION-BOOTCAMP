FROM node:20-alpine

# 권한 설정
RUN mkdir -p /usr/src/app && chown -R node:node /usr/src/app
WORKDIR /usr/src/app

# 사용자 전환
USER root

# 패키지 설치
COPY --chown=node:node package*.json ./
RUN npm install --production

# pm2 설치
RUN npm install -g pm2

# 사용자 전환
USER node

# PM2 홈 디렉터리 환경변수 설정
ENV PM2_HOME=/usr/src/app/.pm2

# 코드 복사
COPY --chown=node:node . .

# 포트 노출
EXPOSE 3000

# PM2로 애플리케이션 실행
CMD ["pm2-runtime", "start", "server-frontend.js"]

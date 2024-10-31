# Redis의 기본 이미지를 사용합니다.
FROM redis:alpine

# Redis 설정 파일을 추가합니다 (필요한 경우).
# 예를 들어, 기본 설정을 덮어쓰고 싶다면 아래 주석을 해제하고 설정 파일을 추가하세요.
# COPY redis.conf /usr/local/etc/redis/redis.conf

EXPOSE 6379

# Redis 서버를 시작합니다.
# CMD ["redis-server", "/usr/local/etc/redis/redis.conf"] # 위에서 설정 파일을 추가한 경우
CMD ["redis-server"]

# 1. Build Stage
FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# 패키지 설치
COPY package.json package-lock.json ./
RUN npm ci

# 소스 복사 및 빌드 (Vite의 결과물은 dist 폴더에 생성됨)
COPY . .
RUN npm run build

# 2. Production Stage (Nginx)
FROM nginx:alpine
# 빌드된 정적 파일을 Nginx의 기본 서빙 폴더로 복사
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# SPA(Single Page Application) 라우팅을 위한 Nginx 설정 적용
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// VITE_DEV_PROXY_TARGET이 설정되면 dev 서버가 /api 요청을 해당 BE로 프록시한다.
// 브라우저 입장에서 FE와 API가 단일 오리진이 되어 크로스 포트 쿠키/CSRF 이슈가 사라진다
// (운영 patentflow.live ↔ api.patentflow.live 동일 사이트 토폴로지와도 유사).
// 미설정 시 기존 동작 그대로. e2e가 사용하며, 로컬 개발에서도 원하면 켤 수 있다.
export default defineConfig(() => {
  const proxyTarget = process.env.VITE_DEV_PROXY_TARGET;
  return {
    plugins: [react()],
    server: proxyTarget
      ? {
          proxy: {
            "/api": {
              target: proxyTarget,
              changeOrigin: false,
            },
          },
        }
      : undefined,
  };
});

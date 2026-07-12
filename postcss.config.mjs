import path from "path";
import { fileURLToPath } from "url";

// 워크스페이스 루트에서 실행돼도 이 프로젝트의 tailwind 설정을 찾도록 절대경로 지정
const dir = path.dirname(fileURLToPath(import.meta.url));

const config = {
  plugins: {
    tailwindcss: { config: path.join(dir, "tailwind.config.ts") },
    autoprefixer: {},
  },
};

export default config;

import type { Config } from "tailwindcss";
import path from "path";
import { fileURLToPath } from "url";

// content 글롭을 설정 파일 기준 절대경로로 (cwd가 워크스페이스 루트여도 스캔되도록).
// Windows 역슬래시는 fast-glob이 경로 구분자로 못 읽으므로 forward slash로 변환.
const root = path.dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");

export default {
  content: [
    `${root}/app/**/*.{js,ts,jsx,tsx,mdx}`,
    `${root}/components/**/*.{js,ts,jsx,tsx,mdx}`,
  ],
  theme: {
    extend: {
      colors: {
        kia: {
          red: "#EA0029",
          dark: "#0B0B0F",
          navy: "#06141B",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "pop-in": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
      },
      animation: {
        "pop-in": "pop-in 0.4s ease-out both",
        "slide-up": "slide-up 0.5s ease-out both",
        wiggle: "wiggle 0.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;

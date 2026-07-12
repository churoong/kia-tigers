# 기아 타이거즈 오늘 어땠어? 🐯

KIA 타이거즈의 **최근 경기 · 최근 시리즈 · 최근 10경기**를 실시간 데이터로 가져와
**유머러스하게** 요약해주는 팬 심심풀이 웹앱. 베스트/워스트 선수까지 뽑아줌.

- **최근 1경기**: 스코어보드 + 유머 헤드라인 + 무드 이모지 + 오늘의 MVP / 반성문(워스트) + 재미 포인트
- **최근 시리즈**: 위닝/루징/스윕 판정 + 드립 코멘트
- **최근 10경기**: 승패 흐름, 연승/연패, 팬 기분지수 게이지
- **더 재밌게**: 자랑용 짤 문구 생성(복사), 상대별 전적, "직관 가면 이길 확률"

## 데이터 소스

- **Naver Sports 비공식 JSON API** (`api-gw.sports.naver.com`) — 무료, API 키 불필요
  - 스케줄/스코어: `/schedule/games`
  - 박스스코어(선수 기록): `/schedule/games/{gameId}/record`
- 유머 분석은 **AI API 없이** 실제 경기 스탯 패턴에서 생성 (완전 무료, 결정론적)
- 연결 실패 시 `lib/snapshot.ts`의 실제 최근 데이터로 **자동 폴백** → 항상 화면이 뜸

> ⚠️ Naver API는 **해외 IP를 지역 차단**할 수 있습니다. 그래서 Vercel 배포 시
> `vercel.json`에서 서버리스 리전을 **서울(icn1)**로 지정했습니다. (아래 배포 참고)

## 로컬 실행

```bash
npm install
npm run dev        # http://localhost:3000
```

> 개발 서버는 한국에서 실행하면 Naver API가 바로 뚫려 실시간 데이터가 나옵니다.

## Vercel 무료 배포 (카드 불필요)

1. GitHub에 이 폴더를 푸시
2. [vercel.com](https://vercel.com) → **Add New → Project** → 저장소 선택
3. 프레임워크 자동 감지(Next.js) → **Deploy**
4. `vercel.json`의 `"regions": ["icn1"]` 덕분에 함수가 **서울 리전**에서 실행 →
   Naver API 지역 차단을 회피

- Hobby(무료) 플랜으로 충분. 결제수단 등록 불필요.
- 데이터는 **10분 ISR 캐싱**(`export const revalidate = 600`)으로 자동 갱신됩니다.
- 배포 직후 첫 몇 분은 (빌드가 미국 리전에서 돌 경우) 스냅샷이 보일 수 있고,
  이후 서울 리전 재검증에서 실시간 데이터로 바뀝니다.

## 구조

```
app/
  layout.tsx        전역 레이아웃 · 폰트 · 메타
  page.tsx          메인 페이지(서버 컴포넌트) — 데이터 fetch + 조립
  globals.css       Tailwind + 커스텀 스타일
lib/
  types.ts          공용 타입
  kbo.ts            Naver Sports 크롤링 레이어(ISR + 폴백)
  snapshot.ts       실패 시 폴백용 실제 데이터(2026-07-09 기준)
  humor.ts          유머 분석 엔진(요약/MVP/워스트/시리즈/최근10경기)
components/
  ui.tsx            Section · ResultPill · Gauge
  TeamLogo.tsx      팀 엠블럼(로드 실패 시 색상 폴백)
  PlayerCard.tsx    베스트/워스트 선수 카드
  GameList.tsx      경기 리스트 · 승패 점표
  ShareCard.tsx     짤 문구 생성 + 복사(클라이언트)
```

## 참고

비공식 팬메이드 재미용 서비스입니다. 모든 분석·드립은 유머일 뿐이며
데이터 저작권은 각 출처에 있습니다. 선수분들 항상 응원합니다 🐯❤️

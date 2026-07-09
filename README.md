# chuno-run (추노)

장소에 구애받지 않고 실시간 GPS로 경쟁하는 러닝 앱. Turborepo 기반 모노레포.

## 구성

```
apps/
  core-api/      NestJS 백엔드 API
  mobile/        Flutter 앱 (Android/iOS)  ← package.json 래퍼로 turbo 연동
  back-office/   React + Vite + TS 백오피스
packages/
  tsconfig/      공용 TypeScript 설정 프리셋
  eslint-config/ 공용 ESLint(flat) 설정
```

- 패키지 매니저: **pnpm**
- 오케스트레이션: **Turborepo**

## 시작하기

```bash
pnpm install              # 워크스페이스 의존성 설치

# Flutter 플랫폼 스캐폴딩(android/ios) 최초 1회 생성
pnpm --filter @chuno/mobile gen

# 모바일: 저장 시 자동 hot reload / restart (apps/mobile/tools/watch_run.sh)
pnpm --filter @chuno/mobile dev      # 또는  pnpm app:watch
#   - lib/*.dart 저장 → hot reload 시도
#   - flutter가 리로드를 거부(const/구조 변경)하면 출력 감지 후 자동 hot restart
#   - 원본 실행: pnpm --filter @chuno/mobile run   (또는  pnpm app:run)

# 전체 태스크
pnpm dev                  # 모든 앱 개발 서버
pnpm build                # 전체 빌드
pnpm lint                 # 전체 린트
pnpm typecheck            # 타입 체크
pnpm test                 # 테스트
```

개별 앱만 실행하려면 `pnpm --filter @chuno/core-api dev` 처럼 `--filter`를 쓴다.

## 이슈보드

기획·이슈·도메인·와이어프레임은 issue-board(MCP)로 관리한다. 자세한 연동 규칙은 `CLAUDE.md` 참고.

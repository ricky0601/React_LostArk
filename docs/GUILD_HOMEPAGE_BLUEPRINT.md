# Lost Ark Guild Homepage Blueprint

## 1. Project Summary

Lost Ark 길드 운영을 위한 전용 홈페이지를 만든다. 길드원은 Discord SSO로 로그인하고, 사용자 권한에 따라 레이드 일정을 조회, 등록, 수정, 삭제하거나 참가 신청을 할 수 있다.

이 문서는 새 길드 홈페이지 전용 레포지토리에서 구현을 시작하기 위한 청사진이다.

## 2. Product Goal

- 길드 공지와 레이드 일정을 한 곳에서 관리한다.
- Discord 계정 기반으로 길드원을 식별한다.
- 사용자 role에 따라 기능 접근 범위를 다르게 한다.
- 초기 개인 프로젝트 비용은 0원에 가깝게 유지한다.
- 별도 백엔드 서버 없이 시작하고, 필요해지는 시점에 worker/server만 분리한다.

## 3. Recommended Stack

```text
Framework: Next.js
Language: TypeScript
Deploy: Vercel Hobby
Auth: Auth.js / NextAuth + Discord OAuth
Database: Supabase Postgres Free
Storage: Supabase Storage, only if needed
Styling: Tailwind CSS or shadcn/ui + Tailwind CSS
Worker/Bot: Not included in MVP
```

## 4. Cost Strategy

초기 MVP는 아래 조합으로 무료 시작을 목표로 한다.

```text
Vercel Hobby: free for personal/non-commercial use
Supabase Free: free within quota
Discord OAuth: free
Auth.js: free and open source
```

주의할 비용 포인트:

- Supabase Free는 DB 500 MB, Storage 1 GB, egress 5 GB 한도가 있다.
- Supabase Free 프로젝트는 1주 비활성 상태면 pause될 수 있다.
- Vercel Hobby는 개인/비상업용 플랜이며 function, CPU, bandwidth 한도가 있다.
- Vercel Hobby cron은 하루 1회 수준으로 제한된다고 보고 설계한다.
- Discord Bot 24시간 구동, 잦은 알림, 배치 작업이 필요해지면 별도 worker 비용이 발생할 수 있다.

## 5. Initial Scope

### Public

- 홈 페이지
- 길드 소개
- 공개 레이드 일정 목록

### Auth

- Discord OAuth 로그인
- 로그아웃
- 로그인 사용자 세션 조회
- 최초 로그인 시 `users` 테이블 upsert

### Authorization

- 사용자별 role 저장
- role 기반 UI 노출
- server action / route handler / API 단에서 권한 재검증

### Raid Schedule

- 레이드 일정 목록 조회
- 레이드 일정 상세 조회
- 레이드 일정 생성
- 레이드 일정 수정
- 레이드 일정 삭제
- 레이드 참가 신청
- 레이드 참가 취소

### Admin

- 사용자 목록 조회
- 사용자 role 변경
- 레이드 일정 관리

## 6. Out of Scope for MVP

- 24시간 Discord Bot
- Lost Ark API 주기적 동기화
- 실시간 WebSocket 서버
- 복잡한 알림 시스템
- 크롤링/배치 worker
- 결제 기능
- 다중 길드 SaaS 구조

해당 기능이 필요해지면 메인 앱은 Vercel에 유지하고, worker/server만 Render, Railway, Cloud Run 중 하나로 분리한다.

## 7. Roles and Permissions

초기 role은 단순하게 시작한다.

```text
guest
member
officer
guild_master
developer
```

권한 규칙:

| Role | Permissions |
| --- | --- |
| `guest` | 공개 페이지 조회 |
| `member` | 레이드 일정 조회, 참가 신청, 참가 취소 |
| `officer` | 레이드 일정 생성, 수정 |
| `guild_master` | 레이드 일정 삭제, 사용자 role 변경 |
| `developer` | 전체 관리 기능 |

권한 체크는 프론트 UI 숨김만으로 처리하지 않는다. 모든 변경 작업은 서버 측에서 role을 다시 확인한다.

## 8. Data Model Draft

### users

```text
id uuid primary key
discord_id text unique not null
discord_username text
display_name text
avatar_url text
role text not null default 'member'
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

### raid_schedules

```text
id uuid primary key
title text not null
raid_name text not null
difficulty text
scheduled_at timestamptz not null
max_participants integer
memo text
created_by uuid references users(id)
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

### raid_participants

```text
id uuid primary key
raid_schedule_id uuid references raid_schedules(id) on delete cascade
user_id uuid references users(id) on delete cascade
character_name text not null
character_class text
status text not null default 'joined'
joined_at timestamptz not null default now()

unique (raid_schedule_id, user_id)
```

참가 상태 후보:

```text
joined
cancelled
waitlisted
```

## 9. Suggested Route Structure

Next.js App Router 기준 초안:

```text
app/
  page.tsx
  login/page.tsx
  raids/page.tsx
  raids/[raidId]/page.tsx
  raids/new/page.tsx
  admin/page.tsx
  admin/users/page.tsx
  api/auth/[...nextauth]/route.ts

src/
  auth.ts
  lib/supabase.ts
  lib/permissions.ts
  features/raids/
  features/users/
  components/
```

## 10. Auth Design

Discord OAuth는 Auth.js의 Discord Provider를 사용한다.

필수 환경 변수:

```text
AUTH_SECRET
AUTH_DISCORD_ID
AUTH_DISCORD_SECRET
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

주의사항:

- `SUPABASE_SERVICE_ROLE_KEY`는 서버에서만 사용한다.
- Discord Developer Portal에 production callback URL을 정확히 등록한다.
- Vercel preview deployment에서 OAuth 테스트가 필요하면 Auth.js redirect proxy 설정을 검토한다.
- 로그인 성공 시 Discord ID를 기준으로 `users`를 upsert한다.

## 11. Permission Design

권한 체크 유틸리티를 먼저 만든다.

```ts
type Role = 'guest' | 'member' | 'officer' | 'guild_master' | 'developer';

const roleRank: Record<Role, number> = {
  guest: 0,
  member: 1,
  officer: 2,
  guild_master: 3,
  developer: 4,
};

export function hasRole(userRole: Role, requiredRole: Role) {
  return roleRank[userRole] >= roleRank[requiredRole];
}
```

서버 변경 작업에서는 항상 아래 흐름을 따른다.

```text
1. 현재 세션 조회
2. DB에서 현재 사용자 role 조회
3. required role과 비교
4. 권한 없으면 forbidden 처리
5. 권한 있으면 mutation 실행
```

## 12. MVP Implementation Order

1. 새 Next.js 레포지토리 생성
2. Tailwind CSS 또는 UI 시스템 설정
3. Vercel 프로젝트 연결
4. Supabase 프로젝트 생성
5. `users`, `raid_schedules`, `raid_participants` 테이블 생성
6. Auth.js + Discord Provider 연결
7. 로그인 후 `users` upsert 구현
8. `permissions` 유틸리티 구현
9. 레이드 일정 목록/상세 조회 구현
10. officer 이상 일정 생성/수정 구현
11. guild_master 이상 일정 삭제 구현
12. member 이상 참가 신청/취소 구현
13. guild_master 이상 사용자 role 변경 구현
14. Vercel production 배포

## 13. Validation Checklist

기능 검증:

- Discord 로그인 성공
- 최초 로그인 시 사용자 row 생성
- 기존 로그인 사용자는 사용자 row 재사용
- member는 일정 생성/수정/삭제 불가
- officer는 일정 생성/수정 가능
- guild_master는 일정 삭제 가능
- guild_master는 사용자 role 변경 가능
- 참가 신청 중복 방지
- 일정 삭제 시 참가자 row cascade 삭제

인프라 검증:

- Vercel production 배포 성공
- production OAuth callback 동작
- Supabase anon key와 service role key 분리
- service role key가 클라이언트 번들에 노출되지 않음
- Supabase Free quota 확인

## 14. Future Expansion

필요해질 때만 추가한다.

### Discord Bot / Worker

용도:

- 레이드 일정 알림
- 참가자 변경 알림
- Discord 채널 공지 자동 발송

후보 인프라:

```text
Render Starter
Railway Hobby
Google Cloud Run
```

### Lost Ark API Sync

용도:

- 캐릭터 정보 조회
- 길드원 캐릭터 검증
- 레이드 참가 캐릭터 클래스 자동 입력

초기에는 수동 입력으로 시작하고, API 동기화는 별도 phase로 둔다.

### Multi-Guild Support

현재 MVP는 단일 길드 전용으로 설계한다. 여러 길드를 지원하는 SaaS 형태는 데이터 모델과 권한 모델이 크게 달라지므로 초기에는 제외한다.

## 15. Recommended First Milestone

첫 milestone은 기능을 작게 자른다.

```text
Milestone 1: Auth + Raid Read

- Next.js app scaffold
- Vercel deploy
- Supabase schema
- Discord login
- users upsert
- raid_schedules list/detail read
```

Milestone 1이 끝나면 권한 기반 mutation을 추가한다.

```text
Milestone 2: Raid Management

- permission utility
- create raid schedule
- edit raid schedule
- delete raid schedule
- participant join/cancel
```

관리자 기능은 마지막에 붙인다.

```text
Milestone 3: Admin

- admin user list
- role change
- raid management dashboard
```

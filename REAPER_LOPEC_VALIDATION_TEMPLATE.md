# 리연/리퍼연구소 기반 Lopec 정합 검증 템플릿

목적: 커뮤니티/영상에서 확인한 "딜 증가량(배율)" 데이터를 우리 시뮬레이터에 안전하게 반영하기 위한 표준 검증 시트.

---

## 1) 데이터 수집 규칙 (필수)

각 샘플마다 아래를 **전부** 기록합니다.

- 출처 URL
- 작성자/채널 식별 (예: 지켜주세요=리연)
- 게시일
- 측정 콘텐츠 종류 (허수/레이드/루메킬/시뮬)
- 기준 캐릭터(닉네임), 직업, 각인/코어
- 시작 전투력 (current CP)
- 변경 항목 (예: 전부 25강, 10겁작 등)
- 변경 후 전투력 또는 로펙 예상값
- 계산식에 사용한 배율 정의 (예: `실측 DPS / 로펙 예상 전투력`)
- 측정 조건
  - 허수 체력/시작 체력
  - 버프/시너지 포함 여부
  - 내실/팔찌 특옵(야추피 등)
  - 측정 횟수/평균 여부

> 하나라도 누락이면 `미검증 샘플`로 분류.

---

## 2) 샘플 기록 표 (복붙용)

| ID | 출처 | 날짜 | 작성자 | 시나리오 | current CP | expected CP(출처) | changed spec | 배율 정의 | 비고 |
|---|---|---|---|---|---:|---:|---|---|---|
| S-001 |  |  |  | 예: 올 25강 |  |  |  |  |  |

---

## 3) 우리 엔진 비교 입력 포맷

`calcLopecDelta(...)` 비교를 위해 샘플마다 아래 상태를 확보:

- 현재 상태
  - `currentScore` (= current CP)
  - `currentEng`
  - `currentGems`
  - `currentEquip`
  - `currentAccessories`
  - `charStats` (`W`, `baseAttack`)
- 변경 상태
  - `modifiedEng`
  - `modifiedGems`
  - `modifiedEquip`
  - `modifiedAccessories`

---

## 4) 비교 계산식 (고정)

### 4-1. 절대 오차

`absError = |ourExpectedCp - sourceExpectedCp|`

### 4-2. 상대 오차

`relErrorPct = absError / sourceExpectedCp * 100`

### 4-3. 증가율 비교

- 출처 증가율: `sourceIncPct = (sourceExpectedCp / currentCp - 1) * 100`
- 우리 증가율: `ourIncPct = (ourExpectedCp / currentCp - 1) * 100`
- 증가율 오차: `incGapPctPoint = |ourIncPct - sourceIncPct|`

---

## 5) 합격 기준 (초안)

### 단일 변경(무기만/보석만/각인만)
- `absError <= max(8, sourceExpectedCp * 0.2%)`
- `incGapPctPoint <= 0.20`

### 복합 변경(전부 25강, 다중 슬롯 동시)
- `absError <= max(15, sourceExpectedCp * 0.35%)`
- `incGapPctPoint <= 0.35`

> 샘플 5개 이상에서 80% 이상 통과 시 "실전 반영 가능".

---

## 6) 실패 원인 분류 체크리스트

실패 시 아래 분류로 원인 태깅:

- [ ] 측정 조건 불일치 (허수 체력/버프/내실)
- [ ] current CP 반올림/표기 정밀도 손실
- [ ] 장비 합성 방식 오류 (additive vs multiplicative)
- [ ] weapon normal-advanced 교차항 처리 누락
- [ ] 절대값 연마 옵션 동적 계산(`W`, `baseAttack`) 미반영
- [ ] 계수 테이블 버전 불일치
- [ ] 데이터 파싱 오류 (장비 tier/레벨 인식)

---

## 7) 테스트 실행 템플릿 (수기/자동 공용)

### 7-1. 수기 기록

| ID | ourExpectedCp | sourceExpectedCp | absError | relErrorPct | ourIncPct | sourceIncPct | incGapPctPoint | PASS/FAIL |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| S-001 |  |  |  |  |  |  |  |  |

### 7-2. 자동화 결과 요약

- total: 
- pass: 
- fail: 
- mean absError: 
- p95 absError: 
- mean incGapPctPoint: 

---

## 8) 실무 적용 순서 (권장)

1. 리연/리퍼연구소 샘플 10개 수집
2. 조건 불명확 샘플 제거
3. 단일 변경 샘플 먼저 정합
4. 복합 변경(올 25강) 정합
5. 통과 후 계수 반영 + 회귀 테스트 고정

---

## 9) 기록 원칙

- 주장/댓글/2차 요약은 증거로 쓰지 않고, **원문 수치**만 채택
- 샘플마다 출처 URL 필수
- 논쟁성 케이스는 "참고"로만 분류하고 계수 학습 제외

# Enhancement backdrop-filter 렌더링 아티팩트

## 요약

`/enhancement` 페이지에서 `보유 재료 입력` 카드 아래에 큰 빈 다크 사각형이 나타나 `재련 재료 시세` 테이블 일부를 덮는 것처럼 보인 이슈입니다.

최종 원인은 DOM 레이아웃 겹침이나 dropdown `z-index`가 아니라, Enhancement 페이지의 밀집된 `GlassCard`들이 공통으로 사용하는 `backdrop-filter`/`backdrop-blur`가 Chrome 계열 브라우저에서 만든 compositor paint artifact로 판단했습니다.

## 증상

- `상급 재련` 또는 `일반 재련` 목표를 선택해 결과 카드가 여러 개 렌더링된 상태에서 발생
- `보유 재료 입력 (선택 사항)` 접힘 카드 아래에 큰 빈 다크 사각형이 표시됨
- 사각형이 `재련 재료 시세` 테이블 위를 덮는 것처럼 보임
- DOM 측정상 실제 카드 높이나 sibling layout은 겹치지 않음
- dropdown을 portal 처리하거나 `z-index`를 올려도 증상이 유지됨

## 잘못 본 가설

### 1. native select/dropdown z-index 문제

처음에는 native `<select>` option popup 또는 custom dropdown layering 문제로 의심했습니다.

대응:
- `src/components/SelectMenu.tsx` 추가
- Enhancement 페이지의 native select 4개를 custom dropdown으로 교체
- custom dropdown을 `document.body` portal + `position: fixed` + 높은 `z-index`로 렌더링

결과:
- select popup 계열 위험은 제거됐지만, 큰 다크 사각형은 계속 재현됨
- 따라서 주 원인은 dropdown이 아니었습니다

### 2. `보유 재료 입력` accordion height 겹침 문제

다음으로 `showOwnedSection` 조건부 렌더링이 아래 테이블을 밀지 못한다고 의심했습니다.

대응:
- 펼침 내용을 fragment가 아닌 명시적인 block wrapper로 감쌈
- DOM에서 `보유 재료 입력` 카드 bottom과 `재련 재료 시세` 카드 top을 측정

결과:
- DOM layout은 정상적으로 간격을 확보함
- 사용자 화면에서는 여전히 사각형이 보였으므로 실제 layout overlap이 아니었습니다

### 3. 카드 단일 요소의 `contain: paint`/`isolate` 문제

`보유 재료 입력` 카드에 `relative isolate overflow-hidden [contain:paint]`를 적용해 paint 영역을 제한하려 했습니다.

결과:
- 효과 없음
- 오히려 `backdrop-filter`가 있는 요소에 paint containment를 추가하면 compositor 경계를 더 복잡하게 만들 수 있어 최종 수정에서 제거했습니다

## 최종 원인

공통 `.glass-card` 스타일은 다음처럼 translucent background와 `backdrop-blur`를 사용합니다.

```css
.glass-card {
  @apply bg-white/70 backdrop-blur-[16px] border border-gray-200/50 rounded-2xl shadow-lg
         dark:bg-white/5 dark:border-white/10 dark:shadow-glass;
}
```

Enhancement 페이지는 계산 결과가 많아질수록 다음 요소들이 연속해서 렌더링됩니다.

- 견적 합계 카드
- 슬롯별/단계별 테이블 카드
- 상급 재련 예상 비용 카드
- `보유 재료 입력` 카드
- `재련 재료 시세` 테이블 카드

이처럼 `backdrop-filter`가 적용된 카드가 테이블/accordion/rounded/overflow 조합으로 밀집하면 Chrome 계열 브라우저에서 blur surface가 사각형 타일처럼 잘못 남는 렌더링 artifact가 발생할 수 있습니다.

특히 이번 증상은 다음 특징 때문에 compositor artifact로 판단했습니다.

- 사각형 크기가 실제 accordion content와 맞지 않음
- DOM layout 측정상 sibling overlap이 없음
- `z-index`, portal, wrapper height 수정으로 해결되지 않음
- Enhancement 카드들의 `backdrop-blur`를 끄자 사용자 수동 테스트에서 해소됨

## 최종 해결

`GlassCard` 전역 스타일은 유지하되, Enhancement 페이지에만 scope class를 추가해 blur를 비활성화했습니다.

```tsx
<main className="enhancement-page max-w-4xl mx-auto px-4 py-6 space-y-5">
```

```css
.enhancement-page .glass-card,
.enhancement-page .glass-card-hover {
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  background-color: rgb(255 255 255 / 0.86);
}

html.dark .enhancement-page .glass-card,
html.dark .enhancement-page .glass-card-hover {
  background-color: rgb(22 27 34 / 0.92);
}
```

효과:
- Enhancement의 table-heavy/card-heavy 화면에서 blur compositor artifact 제거
- 다른 페이지의 glass 효과는 유지
- 시각적으로는 기존 glass 느낌 대신 더 안정적인 semi-opaque card로 대체

## 검증

- `src/pages/Enhancement.tsx` LSP diagnostics: clean
- `npm run build`: 성공
- 사용자 수동 테스트: 동일 재현 경로에서 증상 해소 확인

참고:
- `src/index.css`는 Tailwind `@tailwind`/`@apply`를 사용하므로 Biome CSS parser가 Tailwind-specific syntax를 모른다는 진단을 낼 수 있습니다
- 실제 검증 기준은 CRA/Tailwind build 성공 여부입니다

## 재발 방지 가이드

### table-heavy 페이지에서는 blur 사용을 제한

다음 조건이 겹치는 영역에서는 `backdrop-filter` 사용을 피하는 것이 안전합니다.

- 테이블이 많은 페이지
- accordion/collapsible 영역
- `overflow-hidden`, `rounded-*`, `sticky`, `fixed`, `transform`, `contain`, `isolate`가 섞인 영역
- sibling `GlassCard`가 여러 개 연속으로 렌더링되는 화면

### 증상 재현 시 우선 확인 순서

1. DOM layout이 실제로 겹치는지 측정
2. 열린 portal/dropdown이 남아 있는지 확인
3. `backdrop-filter`를 임시로 끄고 증상이 사라지는지 확인
4. 사라지면 `z-index`나 layout보다 compositor artifact로 판단

### 권장 수정 패턴

- 전역 `.glass-card`를 바로 바꾸지 말고 문제 페이지에 scope class 추가
- 문제 페이지에서만 `backdrop-filter: none` 적용
- 투명도는 낮추고 배경 opacity를 높여 glass 느낌을 일부 유지
- 단일 카드에 `contain: paint`를 추가하는 방식은 우선순위 낮음

## 관련 파일

- `src/index.css`
  - `.glass-card` 기본 blur 스타일
  - `.enhancement-page .glass-card` scoped override
- `src/pages/Enhancement.tsx`
  - `enhancement-page` scope class
  - `보유 재료 입력` / `재련 재료 시세` 렌더링 영역
- `src/components/GlassCard.tsx`
  - 공통 `glass-card` wrapper
- `src/components/SelectMenu.tsx`
  - native select 대체 custom dropdown
  - 이 이슈의 최종 원인은 아니지만, native select popup 계열 위험 제거에 사용됨

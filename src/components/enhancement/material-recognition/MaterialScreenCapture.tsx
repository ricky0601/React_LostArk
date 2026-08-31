import React, { useEffect, useMemo, useState } from 'react';
import type { MaterialType } from '../../../data/enhancement';
import { useMaterialScreenCapture } from './useMaterialScreenCapture';
import type { MaterialIconMap } from './types';

const MAX_OWNED_QUANTITY = 999_999_999;

interface MaterialScreenCaptureProps {
  icons: MaterialIconMap;
  targetMaterials: MaterialType[];
  onApply: (materials: Partial<Record<MaterialType, number>>) => void;
}

const MaterialScreenCapture: React.FC<MaterialScreenCaptureProps> = ({
  icons,
  targetMaterials,
  onApply,
}) => {
  const includesFateShard = targetMaterials.includes('운명의 파편');
  const { status, error, results, scanCount, start, stop, reset } = useMaterialScreenCapture({
    icons,
    targetMaterials,
  });
  const [quantities, setQuantities] = useState<Partial<Record<MaterialType, number>>>({});
  const [excluded, setExcluded] = useState<Set<MaterialType>>(new Set());

  useEffect(() => {
    if (status !== 'review') return;
    setQuantities(Object.fromEntries(results.map((result) => [result.material, result.quantity])));
    setExcluded(new Set(results.filter((result) => (
      result.needsTooltip
    )).map((result) => result.material)));
  }, [results, status]);

  const invalidMaterials = useMemo(() => results.filter((result) => {
    if (excluded.has(result.material)) return false;
    const value = quantities[result.material];
    if (result.needsTooltip && value === result.quantity) return true;
    return value == null || !Number.isInteger(value) || value < 0 || value > MAX_OWNED_QUANTITY;
  }), [excluded, quantities, results]);

  const hasUnconfirmedCappedMaterial = invalidMaterials.some((result) => (
    result.needsTooltip && quantities[result.material] === result.quantity
  ));
  const hasInvalidQuantity = invalidMaterials.some((result) => (
    !result.needsTooltip || quantities[result.material] !== result.quantity
  ));

  const apply = () => {
    if (invalidMaterials.length > 0) return;
    const accepted: Partial<Record<MaterialType, number>> = {};
    results.forEach(({ material }) => {
      if (!excluded.has(material)) accepted[material] = quantities[material];
    });
    onApply(accepted);
    reset();
  };

  if (status === 'sharing' || status === 'requesting') {
    return (
      <div className="rounded-lg border border-la-gold/30 bg-la-gold/5 p-3" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              {status === 'requesting' ? 'Lost Ark 창을 선택해 주세요' : 'Lost Ark 화면을 인식하고 있습니다'}
            </p>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              강화창 재료를 먼저 읽으며, 툴팁 확인 필요 항목은 아이콘에 마우스를 올려 주세요.
              {scanCount > 0 && ` ${results.length}종 감지 · ${scanCount}회 분석`}
            </p>
          </div>
          {status === 'sharing' && (
            <button
              type="button"
              onClick={() => { void stop(); }}
              className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
            >
              화면 공유 중지
            </button>
          )}
        </div>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

        {status === 'sharing' && (
          <div className="mt-3 border-t border-la-gold/20 pt-3">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">인식 결과 확인</p>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              확인한 항목만 기존 보유 재료에 덮어쓰며, 실패하거나 제외한 항목은 유지됩니다.
            </p>
            {results.length === 0 ? (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                재료에 마우스를 올리면 인식된 항목이 여기에 표시됩니다.
              </p>
            ) : (
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {results.map((result) => (
                  <div
                    key={result.material}
                    className={`flex items-center gap-2 rounded-md border p-2 ${
                      result.needsReview
                        ? 'border-orange-400/60 bg-orange-500/5'
                        : 'border-gray-200 dark:border-white/10'
                    }`}
                  >
                    {icons[result.material] && (
                      <img src={icons[result.material]} alt="" className="h-7 w-7 rounded" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-xs text-gray-700 dark:text-gray-300">
                      {result.material}
                      {result.needsTooltip
                        ? <span className="ml-1 text-orange-500">툴팁 확인 필요</span>
                        : result.needsReview && <span className="ml-1 text-orange-500">확인 필요</span>}
                    </span>
                    <span className="text-xs tabular-nums text-gray-700 dark:text-gray-300">
                      {result.quantity.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (status === 'review') {
    return (
      <div className="space-y-3 rounded-lg border border-gray-200/60 bg-gray-50/70 p-3 dark:border-white/10 dark:bg-white/5">
        <div>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">인식 결과 확인</p>
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            확인한 항목만 기존 보유 재료에 덮어쓰며, 실패하거나 제외한 항목은 유지됩니다.
          </p>
        </div>

        {results.length === 0 ? (
          <p className="rounded-md bg-orange-500/10 p-2 text-xs text-orange-600 dark:text-orange-300">
            재료 툴팁을 찾지 못했습니다. 소지품에서 재료에 마우스를 충분히 오래 올린 뒤 다시 시도해 주세요.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {results.map((result) => {
              const isExcluded = excluded.has(result.material);
              return (
                <label
                  key={result.material}
                  className={`flex items-center gap-2 rounded-md border p-2 ${
                    isExcluded
                      ? 'border-gray-200 opacity-50 dark:border-white/10'
                      : result.needsReview
                        ? 'border-orange-400/60 bg-orange-500/5'
                        : 'border-gray-200 dark:border-white/10'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!isExcluded}
                    onChange={(event) => {
                      setExcluded((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.delete(result.material);
                        else next.add(result.material);
                        return next;
                      });
                    }}
                  />
                  {icons[result.material] && (
                    <img src={icons[result.material]} alt="" className="h-7 w-7 rounded" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-xs text-gray-700 dark:text-gray-300">
                    {result.material}
                    {result.needsTooltip
                      ? <span className="ml-1 text-orange-500">툴팁 확인 필요</span>
                      : result.needsReview && <span className="ml-1 text-orange-500">확인 필요</span>}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={MAX_OWNED_QUANTITY}
                    step={1}
                    disabled={isExcluded}
                    value={quantities[result.material] ?? ''}
                    onChange={(event) => {
                      const value = event.target.value === '' ? undefined : Number(event.target.value);
                      setQuantities((current) => ({ ...current, [result.material]: value }));
                    }}
                    aria-label={`${result.material} 인식 수량`}
                    className="w-24 rounded bg-white px-2 py-1 text-right text-xs tabular-nums outline-none focus:ring-1 focus:ring-la-gold/50 disabled:bg-transparent dark:bg-white/10"
                  />
                </label>
              );
            })}
          </div>
        )}

        {hasUnconfirmedCappedMaterial && (
          <p className="text-xs text-red-500">
            9999로 잘려 표시된 재료는 실제 수량을 입력하거나 적용 대상에서 제외해 주세요.
          </p>
        )}
        {hasInvalidQuantity && (
          <p className="text-xs text-red-500">수량은 0 이상 {MAX_OWNED_QUANTITY.toLocaleString()} 이하의 정수여야 합니다.</p>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={apply}
            disabled={results.length === 0 || invalidMaterials.length > 0 || excluded.size === results.length}
            className="rounded-md bg-la-gold px-3 py-1.5 text-xs font-semibold text-gray-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            보유 재료에 적용
          </button>
          <button
            type="button"
            onClick={() => { reset(); void start(); }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/5"
          >
            다시 인식
          </button>
          <button
            type="button"
            onClick={reset}
            className="px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => { void start(); }}
        className="inline-flex items-center rounded-md border border-la-gold/40 bg-la-gold/10 px-3 py-2 text-xs font-semibold text-la-gold-dark transition-colors hover:bg-la-gold/20 dark:text-la-gold"
      >
        Lost Ark 화면에서 자동 불러오기
      </button>
      <div className="space-y-1.5 text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">
        <p className="font-medium text-gray-500 dark:text-gray-400">이렇게 사용해 주세요</p>
        <ol className="list-decimal space-y-1 pl-4">
          <li>Lost Ark 창을 공유한 뒤 <strong className="font-semibold">장비 재련 화면</strong>을 열어 두세요.</li>
          <li>강화창에 보이는 재료 종류와 <strong className="font-semibold">보유 수량</strong>을 자동으로 읽습니다.</li>
          <li>
            수량이 <strong className="font-semibold text-orange-500">9999</strong>로 표시된 재료는 실제 보유량이 잘린 값입니다.
            해당 재료 아이콘에 마우스를 올리고 툴팁이 보이도록 잠시 기다려 주세요.
          </li>
          {includesFateShard && (
            <li>운명의 파편은 게임 상단 바를 먼저 확인하고, 인식되지 않으면 강화창의 소지 금액 첫 번째 값을 읽습니다.</li>
          )}
        </ol>
        <p>공유 화면은 사용자의 브라우저에서만 분석하며 서버로 전송하거나 저장하지 않습니다.</p>
      </div>
      {error && (
        <div className="flex items-start justify-between gap-2 rounded-md bg-red-500/10 p-2" role="alert">
          <p className="text-xs text-red-500">{error}</p>
          <button type="button" onClick={reset} className="shrink-0 text-xs text-gray-400 underline">닫기</button>
        </div>
      )}
    </div>
  );
};

export default MaterialScreenCapture;

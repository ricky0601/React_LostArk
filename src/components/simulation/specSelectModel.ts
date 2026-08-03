export type SpecSelectValue = string | number;

export interface SpecSelectOption<Value extends SpecSelectValue> {
  readonly value: Value;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface SpecSelectSeparator {
  readonly separator: true;
  readonly key: string;
  readonly label?: string;
}

export type SpecSelectItem<Value extends SpecSelectValue> =
  | SpecSelectOption<Value>
  | SpecSelectSeparator;

export const isSpecSelectOption = <Value extends SpecSelectValue>(
  item: SpecSelectItem<Value>,
): item is SpecSelectOption<Value> => 'value' in item;

export const findSpecSelectInitialIndex = <Value extends SpecSelectValue>(
  items: readonly SpecSelectItem<Value>[],
  value: Value,
): number => {
  const selectedIndex = items.findIndex(
    (item) => isSpecSelectOption(item) && !item.disabled && item.value === value,
  );
  if (selectedIndex >= 0) return selectedIndex;
  return items.findIndex((item) => isSpecSelectOption(item) && !item.disabled);
};

export const findSpecSelectNextIndex = <Value extends SpecSelectValue>(
  items: readonly SpecSelectItem<Value>[],
  currentIndex: number,
  direction: 1 | -1,
): number => {
  if (items.length === 0) return -1;
  const startIndex = currentIndex >= 0 ? currentIndex : direction === 1 ? -1 : 0;
  for (let offset = 1; offset <= items.length; offset += 1) {
    const index = (startIndex + direction * offset + items.length) % items.length;
    const item = items[index];
    if (item && isSpecSelectOption(item) && !item.disabled) return index;
  }
  return currentIndex;
};

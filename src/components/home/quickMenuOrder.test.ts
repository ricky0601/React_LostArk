import { reconcileQuickMenuState, reorderQuickMenuItem } from './quickMenuOrder';

const defaultIds = ['/simulation', '/enhancement', '/spec-simulator', '/market', '/new-menu'];
const defaultVisibleIds = ['/simulation', '/enhancement', '/spec-simulator', '/market'];

describe('quickMenuOrder', () => {
  it('ignores deleted IDs and appends new menus to the editable order', () => {
    const storedValue = JSON.stringify({
      order: ['/removed-menu', '/market', '/simulation'],
      visibleIds: ['/removed-menu', '/market'],
    });

    expect(reconcileQuickMenuState(defaultIds, defaultVisibleIds, storedValue)).toEqual({
      order: ['/market', '/simulation', '/enhancement', '/spec-simulator', '/new-menu'],
      visibleIds: ['/market'],
    });
  });

  it('keeps every current menu once when storage contains duplicates and unknown values', () => {
    const storedValue = JSON.stringify({
      order: ['/market', '/market', '/unknown', 1],
      visibleIds: ['/market', '/market', '/unknown'],
    });

    expect(reconcileQuickMenuState(defaultIds, defaultVisibleIds, storedValue)).toEqual({
      order: ['/market', '/simulation', '/enhancement', '/spec-simulator', '/new-menu'],
      visibleIds: ['/market'],
    });
  });

  it('falls back safely when stored JSON is malformed', () => {
    expect(reconcileQuickMenuState(defaultIds, defaultVisibleIds, '{')).toEqual({
      order: defaultIds,
      visibleIds: defaultVisibleIds,
    });
  });

  it('migrates the previous array format as the visible menu selection', () => {
    expect(reconcileQuickMenuState(defaultIds, defaultVisibleIds, JSON.stringify(['/market', '/simulation']))).toEqual({
      order: ['/market', '/simulation', '/enhancement', '/spec-simulator', '/new-menu'],
      visibleIds: ['/market', '/simulation'],
    });
  });

  it('allows an intentionally empty visible selection', () => {
    const storedValue = JSON.stringify({ order: defaultIds, visibleIds: [] });

    expect(reconcileQuickMenuState(defaultIds, defaultVisibleIds, storedValue).visibleIds).toEqual([]);
  });

  it('reorders one menu relative to another without mutating the original order', () => {
    const ids = ['/simulation', '/enhancement', '/market'];

    expect(reorderQuickMenuItem(ids, '/simulation', '/enhancement')).toEqual([
      '/enhancement', '/simulation', '/market',
    ]);
    expect(ids).toEqual(['/simulation', '/enhancement', '/market']);
  });
});

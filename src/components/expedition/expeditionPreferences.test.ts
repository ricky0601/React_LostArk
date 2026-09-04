import { loadExpeditionPreferences, saveExpeditionPreferences } from './expeditionPreferences';

describe('expedition dashboard preferences', () => {
  beforeEach(() => window.localStorage.clear());

  it('restores deselected characters and selects newly discovered siblings', () => {
    saveExpeditionPreferences('대표캐릭', {
      viewMode: 'grid',
      selectedCharacters: ['캐릭A'],
      knownCharacters: ['캐릭A', '캐릭B'],
      collapsedServers: ['루페온'],
      isRosterExpanded: false,
    });

    expect(loadExpeditionPreferences('대표캐릭', ['캐릭A', '캐릭B', '신규캐릭'])).toEqual({
      viewMode: 'grid',
      selectedCharacters: ['캐릭A', '신규캐릭'],
      knownCharacters: ['캐릭A', '캐릭B', '신규캐릭'],
      collapsedServers: ['루페온'],
      isRosterExpanded: false,
    });
  });

  it('selects only the first six characters by default', () => {
    const names = Array.from({ length: 8 }, (_, index) => `캐릭${index + 1}`);

    expect(loadExpeditionPreferences('대표캐릭', names).selectedCharacters).toEqual(names.slice(0, 6));
  });

  it('does not auto-select newly discovered characters after the selection limit is reached', () => {
    const selectedCharacters = Array.from({ length: 6 }, (_, index) => `캐릭${index + 1}`);
    saveExpeditionPreferences('대표캐릭', {
      viewMode: 'card',
      selectedCharacters,
      knownCharacters: selectedCharacters,
      collapsedServers: [],
      isRosterExpanded: true,
    });

    expect(loadExpeditionPreferences('대표캐릭', [...selectedCharacters, '신규캐릭']).selectedCharacters)
      .toEqual(selectedCharacters);
  });

  it('defaults the roster section to expanded for older stored preferences', () => {
    window.localStorage.setItem('loaExpeditionDashboard:v1:대표캐릭', JSON.stringify({
      viewMode: 'card',
      selectedCharacters: ['캐릭A'],
      knownCharacters: ['캐릭A'],
      collapsedServers: [],
    }));

    expect(loadExpeditionPreferences('대표캐릭', ['캐릭A']).isRosterExpanded).toBe(true);
  });

  it('clamps a legacy over-limit selection to the maximum', () => {
    const selectedCharacters = Array.from({ length: 14 }, (_, index) => `캐릭${index + 1}`);
    saveExpeditionPreferences('대표캐릭', {
      viewMode: 'card',
      selectedCharacters,
      knownCharacters: selectedCharacters,
      collapsedServers: [],
      isRosterExpanded: true,
    });

    expect(loadExpeditionPreferences('대표캐릭', selectedCharacters).selectedCharacters).toHaveLength(12);
  });

  it('falls back safely when stored data is malformed', () => {
    window.localStorage.setItem('loaExpeditionDashboard:v1:대표캐릭', '{invalid');
    expect(loadExpeditionPreferences('대표캐릭', ['캐릭A'])).toMatchObject({
      viewMode: 'card',
      selectedCharacters: ['캐릭A'],
      isRosterExpanded: true,
    });
  });
});

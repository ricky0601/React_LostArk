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

  it('defaults the roster section to expanded for older stored preferences', () => {
    window.localStorage.setItem('loaExpeditionDashboard:v1:대표캐릭', JSON.stringify({
      viewMode: 'card',
      selectedCharacters: ['캐릭A'],
      knownCharacters: ['캐릭A'],
      collapsedServers: [],
    }));

    expect(loadExpeditionPreferences('대표캐릭', ['캐릭A']).isRosterExpanded).toBe(true);
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

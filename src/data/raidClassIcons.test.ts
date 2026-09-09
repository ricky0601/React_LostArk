import { describe, expect, it } from 'vitest';
import { RAID_CLASS_DATA } from './raidComposition';
import { RAID_CLASS_ICON_BY_NAME, RAID_CLASS_ICON_TEMPLATES } from './raidClassIcons';

describe('raid class icon templates', () => {
  it('has one local official icon for every supported advanced class', () => {
    expect(RAID_CLASS_ICON_TEMPLATES).toHaveLength(30);
    expect(new Set(RAID_CLASS_ICON_TEMPLATES.map(({ className }) => className)).size).toBe(30);

    RAID_CLASS_DATA.forEach(({ name }) => {
      expect(RAID_CLASS_ICON_BY_NAME.get(name)).toMatchObject({
        className: name,
        url: expect.stringMatching(/^\/images\/raid-composition\/classes\/.+\.svg$/),
        sourceUrl: expect.stringMatching(/^https:\/\/cdn-lostark\.game\.onstove\.com\/.+\.svg$/),
      });
    });
  });
});

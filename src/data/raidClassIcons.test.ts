import { existsSync, statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { RAID_CLASS_DATA } from './raidComposition';
import { RAID_CLASS_ICON_BY_NAME, RAID_CLASS_ICON_TEMPLATES } from './raidClassIcons';

describe('raid class icon templates', () => {
  it('has one local official icon for every supported advanced class', () => {
    expect(RAID_CLASS_ICON_TEMPLATES).toHaveLength(30);
    expect(new Set(RAID_CLASS_ICON_TEMPLATES.map(({ className }) => className)).size).toBe(30);

    RAID_CLASS_DATA.forEach(({ name }) => {
      const template = RAID_CLASS_ICON_BY_NAME.get(name);
      expect(template).toMatchObject({
        className: name,
        url: expect.stringMatching(/^\/images\/raid-composition\/classes\/.+\.svg$/),
        sourceUrl: expect.stringMatching(/^https:\/\/cdn-lostark\.game\.onstove\.com\/.+\.svg$/),
      });
      const assetPath = join(process.cwd(), 'public', template!.url.slice(1));
      expect(existsSync(assetPath), `${template!.url} should exist under public/`).toBe(true);
      expect(statSync(assetPath).size, `${template!.url} should not be empty`).toBeGreaterThan(0);
    });
  });
});

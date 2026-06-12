import { STOVE_SCRIPT } from './stoveScript';

describe('STOVE_SCRIPT safety guards', () => {
  it('stays syntactically valid as a pasted console script', () => {
    expect(() => new Function(STOVE_SCRIPT)).not.toThrow();
  });

  it('escapes dynamic text before injecting the result HTML', () => {
    expect(STOVE_SCRIPT).toContain('const escapeHtml');
    expect(STOVE_SCRIPT).toContain('escapeHtml(n)');
    expect(STOVE_SCRIPT).toContain('u.map(escapeHtml)');
    expect(STOVE_SCRIPT).toContain('escapeHtml(m)');
    expect(STOVE_SCRIPT).toContain('escapeHtml(cn)');
  });

  it('does not rely on inline click handlers in generated markup', () => {
    expect(STOVE_SCRIPT).not.toMatch(/onclick\s*=/i);
    expect(STOVE_SCRIPT).toContain('data-toggle-next');
    expect(STOVE_SCRIPT).toContain('addEventListener');
  });
});

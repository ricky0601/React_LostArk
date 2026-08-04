import { normalizePathname } from './routes';

test.each([
  ['/changelog', '/changelog'],
  ['/changelog/', '/changelog'],
  ['/changelog///', '/changelog'],
  ['/', '/'],
  ['//', '/'],
])('normalizes %s to %s', (input, expected) => {
  expect(normalizePathname(input)).toBe(expected);
});

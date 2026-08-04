// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// jsdom does not implement window.scrollTo; NavBar's mobile drawer scroll-lock calls it on cleanup.
window.scrollTo = jest.fn();

// jest 27의 jsdom에는 TextEncoder/TextDecoder가 없다. react-router 7이 모듈 로드 시점에 참조한다.
if (typeof globalThis.TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TextEncoder, TextDecoder } = require('util');
  Object.assign(globalThis, { TextEncoder, TextDecoder });
}

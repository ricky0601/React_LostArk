const assert = require('node:assert/strict');
const { describe, test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const {
  ARTICLE_PARSE_ERRORS,
  extractInvenTargetSection,
  parseInvenSearchHtml,
  targetSectionHasNickname,
  toValidatedResultUrl,
} = require('./parser');

const fixture = (name) => readFileSync(join(__dirname, '__fixtures__', name), 'utf8');

describe('Inven incident result parser', () => {
  test('parses subject links while excluding notices and untrusted URLs', () => {
    assert.deepEqual(parseInvenSearchHtml(fixture('search-results.html')), [{
      title: '테스트닉 관련 제보',
      url: 'https://www.inven.co.kr/board/lostark/5355/123456',
    }]);
  });

  test('recognizes the actual no-results message', () => {
    assert.deepEqual(parseInvenSearchHtml(fixture('no-results.html')), []);
  });

  test('rejects malformed upstream HTML instead of treating it as empty', () => {
    assert.throws(() => parseInvenSearchHtml('<html><body>changed markup</body></html>'), /INVEN_HTML_STRUCTURE/);
    assert.throws(
      () => parseInvenSearchHtml('<html><body><p>작성된 게시글이 없습니다.</p></body></html>'),
      /INVEN_HTML_STRUCTURE/,
    );
  });

  test('accepts only exact incident board article URLs', () => {
    assert.equal(toValidatedResultUrl('/board/lostark/5355/42'), 'https://www.inven.co.kr/board/lostark/5355/42');
    assert.equal(toValidatedResultUrl('https://www.inven.co.kr/board/lostark/5355/42?query=list'), 'https://www.inven.co.kr/board/lostark/5355/42');
    assert.equal(toValidatedResultUrl('https://www.inven.co.kr/board/lostark/5356/42'), null);
    assert.equal(toValidatedResultUrl('https://evil.example/board/lostark/5355/42'), null);
  });
});

describe('Inven article target parser', () => {
  test('extracts only the target field across div/span markup and punctuation', () => {
    const section = extractInvenTargetSection(fixture('article-target.html'));
    assert.equal(section, '루페온 / 테스트닉, 다른닉・세번째닉');
    assert.equal(targetSectionHasNickname(section, '테스트닉'), true);
    assert.equal(targetSectionHasNickname(section, '다른닉'), true);
  });

  test('does not match author, description, metadata, or nickname substrings', () => {
    const section = extractInvenTargetSection(fixture('article-author-only.html'));
    assert.equal(targetSectionHasNickname(section, '테스트닉'), false);
    assert.equal(targetSectionHasNickname('루페온 / 테스트닉임', '테스트닉'), false);
    assert.equal(targetSectionHasNickname('루페온 / 테스트닉', '스트닉'), false);
  });

  test('reports distinct errors for each unverifiable article structure', () => {
    assert.throws(
      () => extractInvenTargetSection('<html><body>대상자: 테스트닉<br>■ 사건 설명</body></html>'),
      { code: ARTICLE_PARSE_ERRORS.BODY_MISSING },
    );
    assert.throws(
      () => extractInvenTargetSection('<div id="powerbbsContent">■ 게임 닉네임<br>작성자: 테스트닉<br>■ 사건 설명</div>'),
      { code: ARTICLE_PARSE_ERRORS.TARGET_MISSING },
    );
    assert.throws(
      () => extractInvenTargetSection('<div id="powerbbsContent">■ 게임 닉네임<br>대상자:<br>작성자: 테스트닉<br>■ 사건 설명</div>'),
      { code: ARTICLE_PARSE_ERRORS.TARGET_MISSING },
    );
    assert.throws(
      () => extractInvenTargetSection('<div id="powerbbsContent">■ 게임 닉네임<br>대상자: 첫번째닉<br>대상자: 두번째닉<br>■ 사건 설명</div>'),
      { code: ARTICLE_PARSE_ERRORS.TARGET_MISSING },
    );
    assert.throws(
      () => extractInvenTargetSection(fixture('article-malformed.html')),
      { code: ARTICLE_PARSE_ERRORS.DESCRIPTION_MISSING },
    );
  });
});

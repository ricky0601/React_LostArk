const RESULT_URL_PATTERN = /^https:\/\/www\.inven\.co\.kr\/board\/lostark\/5355\/\d+$/;

const ARTICLE_PARSE_ERRORS = Object.freeze({
  BODY_MISSING: 'INVEN_ARTICLE_BODY_MISSING',
  TARGET_MISSING: 'INVEN_ARTICLE_TARGET_MISSING',
  DESCRIPTION_MISSING: 'INVEN_ARTICLE_DESCRIPTION_MISSING',
});

class InvenArticleParseError extends Error {
  constructor(code) {
    super(code);
    this.name = 'InvenArticleParseError';
    this.code = code;
  }
}

function decodeHtml(value) {
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const radix = entity[1]?.toLowerCase() === 'x' ? 16 : 10;
      const code = parseInt(entity.slice(radix === 16 ? 2 : 1), radix);
      return Number.isFinite(code) && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code)
        : match;
    }
    return entities[entity.toLowerCase()] ?? match;
  });
}

function toValidatedResultUrl(href) {
  if (typeof href !== 'string') return null;
  let url;
  try {
    url = new URL(decodeHtml(href), 'https://www.inven.co.kr');
  } catch {
    return null;
  }
  const normalized = `${url.origin}${url.pathname.replace(/\/$/, '')}`;
  return RESULT_URL_PATTERN.test(normalized) ? normalized : null;
}

function parseInvenSearchHtml(html) {
  if (typeof html !== 'string' || !/<(?:html|body|table|tr)\b/i.test(html)) {
    throw new Error('INVEN_HTML_STRUCTURE');
  }
  const results = [];
  let hasStructuredEmptyRow = false;
  const rowPattern = /<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const rowText = decodeHtml(rowMatch[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    if (rowText.includes('작성된 게시글이 없습니다.')) hasStructuredEmptyRow = true;
    if (/\bclass\s*=\s*["'][^"']*\bnotice\b/i.test(rowMatch[1])) continue;
    const anchorPattern = /<a\b([^>]*\bclass\s*=\s*["'][^"']*\bsubject-link\b[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi;
    let anchorMatch;
    while ((anchorMatch = anchorPattern.exec(rowMatch[2])) !== null) {
      const href = /\bhref\s*=\s*(["'])(.*?)\1/i.exec(anchorMatch[1])?.[2];
      const url = toValidatedResultUrl(href);
      if (!url) continue;
      const title = decodeHtml(anchorMatch[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
      if (title) results.push({ title, url });
    }
  }
  if (results.length === 0 && !hasStructuredEmptyRow) {
    throw new Error('INVEN_HTML_STRUCTURE');
  }
  return Array.from(new Map(results.map((result) => [result.url, result])).values());
}

function getPowerbbsContentHtml(html) {
  if (typeof html !== 'string') throw new InvenArticleParseError(ARTICLE_PARSE_ERRORS.BODY_MISSING);
  const openingDivPattern = /<div\b[^>]*>/gi;
  let opening;
  while ((opening = openingDivPattern.exec(html)) !== null) {
    const id = /\bid\s*=\s*(?:(["'])powerbbsContent\1|powerbbsContent(?=\s|>))/i.exec(opening[0]);
    if (!id) continue;

    const contentStart = openingDivPattern.lastIndex;
    const divPattern = /<\/?div\b[^>]*>/gi;
    divPattern.lastIndex = contentStart;
    let depth = 1;
    let tag;
    while ((tag = divPattern.exec(html)) !== null) {
      if (/^<\/div/i.test(tag[0])) depth -= 1;
      else if (!/\/\s*>$/.test(tag[0])) depth += 1;
      if (depth === 0) return html.slice(contentStart, tag.index);
    }
    break;
  }
  throw new InvenArticleParseError(ARTICLE_PARSE_ERRORS.BODY_MISSING);
}

function articleHtmlToText(html) {
  return decodeHtml(html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(?:div|p|li|tr|td|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ''))
    .replace(/\r/g, '')
    .replace(/[\t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n');
}

function extractInvenTargetSection(html) {
  const text = articleHtmlToText(getPowerbbsContentHtml(html));
  const description = /(?:^|\n)\s*(?:■\s*)?사건\s*설명\s*(?:[:：])?\s*(?=\n|$)/m.exec(text);
  if (!description) throw new InvenArticleParseError(ARTICLE_PARSE_ERRORS.DESCRIPTION_MISSING);

  const metadata = text.slice(0, description.index);
  const identityHeading = /(?:^|\n)\s*(?:■\s*)?게임\s*닉네임\s*(?=\n|$)/m.exec(metadata);
  if (!identityHeading) throw new InvenArticleParseError(ARTICLE_PARSE_ERRORS.TARGET_MISSING);

  const identitySection = metadata.slice(identityHeading.index + identityHeading[0].length);
  const target = /(?:^|\n)\s*대상자\s*[:：]\s*/m.exec(identitySection);
  if (!target) throw new InvenArticleParseError(ARTICLE_PARSE_ERRORS.TARGET_MISSING);
  const afterTarget = identitySection.slice(target.index + target[0].length);
  const nextField = /(?:작성자|대상자)\s*[:：]/.exec(afterTarget);
  const targetSection = afterTarget.slice(0, nextField?.index ?? afterTarget.length).trim();
  if (!targetSection || nextField) {
    throw new InvenArticleParseError(ARTICLE_PARSE_ERRORS.TARGET_MISSING);
  }
  return targetSection;
}

function targetSectionHasNickname(targetSection, nickname) {
  if (typeof targetSection !== 'string' || typeof nickname !== 'string' || !nickname) return false;
  const escapedNickname = nickname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const nicknameCharacter = '가-힣A-Za-z0-9';
  return new RegExp(`(^|[^${nicknameCharacter}])${escapedNickname}(?=$|[^${nicknameCharacter}])`).test(targetSection);
}

module.exports = {
  ARTICLE_PARSE_ERRORS,
  InvenArticleParseError,
  extractInvenTargetSection,
  parseInvenSearchHtml,
  targetSectionHasNickname,
  toValidatedResultUrl,
};

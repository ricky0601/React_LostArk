/** LoA 장비 툴팁 HTML 파싱 공통 유틸 */

export interface EffectSegment { text: string; color: string | null }

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/** LoA tooltip color hex → option grade
 *  색상 코드에 # 없이 쓰이는 경우도 처리 (예: CE43FC)
 */
export function htmlColorToGrade(html: string): string | null {
  const m = html.match(/color=['"]?#?([0-9A-Fa-f]{6})['">\s]/i);
  if (!m) return null;
  const hex = m[1].toUpperCase();
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (r > 200 && g < 80  && b < 80)  return '최상'; // red
  if (r > 200 && g > 80  && b < 80)  return '상';   // orange #FE9600
  if (r > 150 && g < 80  && b > 150) return '중';   // purple/magenta #CE43FC
  if (r < 80  && g > 150 && b < 80)  return '중';   // green
  return null;
}

/** HTML 한 줄을 <FONT COLOR> 태그 기준으로 색상 세그먼트 배열로 파싱
 *  팔찌·어빌리티스톤·악세사리 연마효과에 공통 사용
 */
export function parseBraceletLine(html: string): EffectSegment[] {
  const segments: EffectSegment[] = [];
  const cleaned = html.replace(/<\/?img[^>]*>\s*/gi, '').replace(/&nbsp;/g, ' ');
  const parts = cleaned.split(/(<FONT\b[^>]*>[\s\S]*?<\/FONT>)/gi);
  for (const part of parts) {
    const fm = part.match(/^<FONT\b[^>]*COLOR=['"]?#?([0-9A-Fa-f]{6})/i);
    if (fm) {
      const color = `#${fm[1].toUpperCase()}`;
      const innerText = part.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
      if (innerText.trim()) segments.push({ text: innerText, color });
    } else {
      const text = part.replace(/<br\s*\/?>/gi, '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
      if (text.trim()) segments.push({ text, color: null });
    }
  }
  return segments;
}

/**
 * 한국개미실종연구소 — 응답 시트용 Apps Script (v4, 메일 발송 없음)
 *
 * 설치:
 *  1. 응답 스프레드시트 → 확장 프로그램 → Apps Script → 이 파일 내용 전체 붙여넣기
 *  2. WEBHOOK 수정 (슬랙 Incoming Webhook URL — 절대 공개 저장소에 올리지 말 것)
 *  3. setup ▶ 실행 → 권한 승인 → 트리거 2개 자동 생성 (onFormSubmit / onSheetEdit)
 *  4. 응답 시트 맨 오른쪽 열: "판정", "사유", "통지"
 *       판정에 확정 / 반려 / 보류 / 역방향 / 숨김 을 적으면 사이트 노출과 슬랙 알림이 그 값을 따릅니다.
 *       임명장은 사이트에서 제보자가 직접 다운로드하므로 이메일은 수집하지 않습니다.
 */

const WEBHOOK   = 'https://hooks.slack.com/services/여기에_웹훅_URL';
const SS_ID     = '1qSnEw_8bkr-TAW6vrfqB-MB1WxRpci3m1NHEhsnSEms';
const SITE_URL  = 'https://keev-lim.github.io/ant-institute/';
const FOUNDER_COUNT = 1;               // 사이트와 동일 (창립자 사례 수)

const COL = { JUDGE: '판정', REASON: '사유', NOTIFIED: '통지', TYPE: '현상 유형' };

/* ---------- 설치 ---------- */
function setup() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(SS_ID).onFormSubmit().create();
  ScriptApp.newTrigger('onSheetEdit').forSpreadsheet(SS_ID).onEdit().create();
  slack_('*[한국개미실종연구소] 스크립트 v4 설치 완료* — 메일 발송 제거, 슬랙 알림만 유지');
}

/* ---------- 공용 ---------- */
function esc_(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function pad_(n) { return String(n).padStart(4, '0'); }
function headers_(sheet) { return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim()); }
function colIndex_(headers, name) { const i = headers.findIndex(h => h.replace(/\s+/g, '').indexOf(name.replace(/\s+/g, '')) >= 0); return i < 0 ? -1 : i + 1; }
function rowObj_(sheet, row) {
  const H = headers_(sheet); const vals = sheet.getRange(row, 1, 1, H.length).getValues()[0]; const o = {};
  H.forEach((h, i) => o[h.replace(/\s+/g, '')] = String(vals[i] == null ? '' : vals[i]).trim());
  const g = k => o[k.replace(/\s+/g, '')] || '';
  return { get: g, caseNo: FOUNDER_COUNT + row - 1, judge: g(COL.JUDGE), reason: g(COL.REASON), type: g(COL.TYPE) };
}
function rateLimited_() {
  const cache = CacheService.getScriptCache(); const n = Number(cache.get('cnt') || 0) + 1;
  cache.put('cnt', String(n), 600); return n > 5;
}
function slack_(text) {
  if (rateLimited_()) return;
  const res = UrlFetchApp.fetch(WEBHOOK, { method: 'post', contentType: 'application/json', payload: JSON.stringify({ text }), muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Slack ' + res.getResponseCode() + ': ' + res.getContentText());
}
function testSlack() { slack_('*[한국개미실종연구소] 연결 테스트* — 이 메시지가 보이면 웹훅은 정상'); }

/* ---------- 1) 제보 접수: 슬랙 알림 ---------- */
function onFormSubmit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet(); const row = e.range.getRow();
  const r = rowObj_(sheet, row); const no = pad_(r.caseNo);
  const g = k => esc_(r.get(k) || '—');
  const isReverse = r.type === '개미가 생김';
  slack_([
    `*[한국개미실종연구소] 사건 #${no} 접수*${isReverse ? ' _(역방향 R-PMAV)_' : ''}`,
    `지역: ${g('발생 지역')} · 입주: ${g('입주 시기')} · ${g('주거 형태')}`,
    `개미: ${g('개미 종류')} · 소실까지: ${g('소실 기간')} · 방제: ${g('방제 이력')}`,
    `횟수: ${g('경험 횟수')} · 제3자 증언: ${g('제3자 증언')}`,
    `> ${g('진술')}`,
    `가설: ${g('본인 가설')}`,
    `_판정: 시트 "판정" 열에 확정/반려/보류 입력 → 사이트 반영_ · <${SITE_URL}#archive|기록부>`
  ].join('\n'));
}

/* ---------- 2) 판정 입력: 슬랙 기록 + 통지 열 ---------- */
function onSheetEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet(); const row = e.range.getRow(); const colNum = e.range.getColumn();
  if (row < 2) return;
  const H = headers_(sheet);
  if (colNum !== colIndex_(H, COL.JUDGE)) return;
  const notifiedCol = colIndex_(H, COL.NOTIFIED);
  const r = rowObj_(sheet, row); const no = pad_(r.caseNo);
  const judge = String(e.value || '').trim();
  const stamp = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
  let note = '';

  if (judge === '확정') {
    const title = r.type === '개미가 생김' ? '객원연구원(역방향 부문)' : '객원연구원';
    slack_(`✅ 사건 #${no} *확정* — ${title} 임명장 발급 가능 · <${SITE_URL}#case-${no}|기록부 보기>`);
    note = `확정 ${stamp}`;
  } else if (judge === '반려') {
    const reason = r.reason || '판정 기준 미충족 또는 진술 불충분';
    slack_(`⛔ 사건 #${no} *반려* (${esc_(reason)})`);
    note = `반려 ${stamp}`;
  } else if (judge === '보류') {
    slack_(`⏸ 사건 #${no} *보류*`); note = `보류 ${stamp}`;
  } else if (judge === '숨김' || judge === '역방향') {
    note = `${judge} ${stamp}`;
  } else return;

  if (notifiedCol > 0) sheet.getRange(row, notifiedCol).setValue(note);
}

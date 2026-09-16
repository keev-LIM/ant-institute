# 한국개미실종연구소 — 사이트 소스

GitHub Pages용 정적 사이트. 응답 시트 CSV를 읽어 사건 기록부·집계·지역 분포·사례 카드를 자동 갱신합니다.

## 파일
- `_head.html` `_style.css` `_extra.css` `_body.html` `_script.js` — 소스 조각 (build.sh가 합침)
- `build.sh` — index.html / robots.txt / sitemap.xml / llms.txt 생성
- `index.html` — 빌드 결과 (배포 대상)
- `og.jpg` `favicon.svg` — 공유 이미지·아이콘
- `apps-script.gs` — 응답 시트에 붙일 Apps Script (슬랙 알림 · 판정 기록, 메일 발송 없음)
- `test/` — 로컬 테스트용 샘플 CSV (배포 시 삭제해도 됨)

## 빌드
```
./build.sh "https://USER.github.io/REPO/" "<응답시트 웹게시 CSV URL>" <현상유형 entry ID|null> null
```
예) `./build.sh "https://keev-lim.github.io/ant-institute/" "https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?output=csv" 123456789 null`

빌드 후 폴더 전체를 리포 루트에 올리고 Settings → Pages → Branch main / (root).

## 응답 시트 관리 열 (맨 오른쪽에 추가)
- `판정` — 확정 / 반려 / 보류 / 역방향 / 숨김
- `사유` — 반려 사유 (사이트 카드에 표시)
- `통지` — 스크립트가 판정 기록을 자동 기입

## 배포 후 확인
- `https://…/llms.txt`, `/robots.txt`, `/sitemap.xml` 열리는지
- Google Search Console에 사이트 등록 + sitemap 제출
- 카카오톡·슬랙에 링크 붙여 OG 미리보기 확인

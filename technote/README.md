# TechNote · IT기술 A4 1페이지 노트

기술명을 입력하면 **개념 · 배경 · 목적 · 도식화 · 유사기술 · 출처** 6개 항목으로 A4 1페이지 학습 노트를 작성하고,
로컬 PC의 지정 폴더에 `기술명.txt`로 저장·조회·수정·삭제·검색하는 브라우저 전용 도구입니다.
서버·빌드 없이 `index.html` 하나로 동작하므로 GitHub 저장소로 관리하고 브라우저 북마크로 사용합니다.

## 주요 기능

| 구분 | 기능 |
|---|---|
| Create | 기술명 입력 → 6개 항목 작성(직접 입력 / AI 초안 / 프롬프트 복사·붙여넣기) → `기술명.txt` 저장 |
| Read | 폴더 내 `*.txt` 목록 표시, 클릭 시 편집기·A4 미리보기에 로드 |
| Update | 내용 수정 후 저장(Ctrl+S), 기술명 변경 시 파일명도 변경 |
| Delete | 선택 문서의 txt 파일 삭제 |
| 검색 | 기술명 + 본문 전체 대상, 공백 구분 AND 검색, 일치 부분 강조 (Ctrl+K) |
| 저장 폴더 | [폴더 선택]으로 지정, **마지막 사용 폴더를 기억하여 기본 폴더로 사용** |
| A4 1페이지 | 실시간 A4 미리보기 + 사용률 게이지(100% 초과 시 경고), 인쇄/PDF |
| 작성 보조 | 개념 20자 카운터, **굵게**(Ctrl+B), 도식 폭 측정, 출처 미기재 경고 |

## 노트 형식 (txt)

```
■ 기술명: 제로트러스트 Zero Trust
■ 작성일: 2026-09-30 10:00   ■ 수정일: 2026-09-30 10:00
────────────────────────────────────────

1. (개념)
**지속 검증** 기반 **무신뢰** 보안 모델      ← 20자 이내, 핵심 키워드는 **굵게**

2. (배경)      왜 이 기술이 등장했는지
3. (목적)      어떤 문제를 해결하기 위함인지
4. (도식화)    핵심 구성·동작과정 텍스트 도식
5. (유사기술)  - 기술명 : 차이점  (3개)
6. (출처)      - 문서명, 발행기관, 연도, URL/표준번호
```

`samples/` 폴더에 예시 파일이 있습니다. 메모장에서 직접 수정해도 형식만 유지하면 다시 읽어 들입니다.

## 사용 방법

### 1) GitHub Pages로 사용 (권장)
1. 이 폴더를 GitHub 저장소로 push
2. 저장소 **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`** 저장
3. `https://<계정>.github.io/<저장소>/` 를 북마크

### 2) 로컬 파일로 사용
`index.html`을 Chrome/Edge로 열고 `file:///C:/workspace/.../index.html` 을 북마크합니다.

### 3) 북마크 바로가기 (선택)
URL 뒤에 `?q=기술명`을 붙이면 해당 노트를 바로 열거나(없으면 새로 작성) 합니다.
Chrome **설정 → 검색엔진 → 사이트 검색 추가**에 `…/index.html?q=%s` 를 등록하면
주소창에서 `tn 제로트러스트` 처럼 호출할 수 있습니다.

## 처음 실행 시
1. **[폴더 선택]** → 노트를 저장할 폴더 지정 → "파일 수정 허용" 승인
2. 다음 실행부터는 이전 폴더가 기본으로 지정되며, 보안정책상 **[다시 연결]** 버튼을 한 번 눌러 권한을 허용합니다.
   (Chrome/Edge의 "이 사이트에 계속 허용" 옵션을 선택하면 이후 자동 연결)

## AI 초안 (선택) — OIDC 연동, API Key 미사용
장기 API Key 대신 **Workload Identity Federation(WIF)** 으로 GitHub Actions의 OIDC 토큰을 Claude 단기 액세스 토큰(`sk-ant-oat01-…`)으로 교환해 사용합니다.
토큰 교환 엔드포인트(`/v1/oauth/token`)는 브라우저 CORS를 허용하지 않으므로, 교환은 GitHub Actions에서 하고 결과만 **암호화**해 붙여넣습니다.

```
[Run workflow] → GitHub OIDC JWT → POST /v1/oauth/token → sk-ant-oat01 (10분)
             → AES-256-GCM 암호화 → 실행 Summary에 TNTOK1.… 출력
[TechNote 설정] TNTOK1.… + 암호 문구 → 복호화 → Authorization: Bearer 로 /v1/messages 호출
```

### 1회 설정
1. Claude Console → **Settings → Workload identity → Connect workload → GitHub Actions** (이미 생성했다면 생략)
   - 규칙 match: `subject_prefix` = `repo:<계정>/<저장소>:ref:refs/heads/<기본브랜치: main 또는 master>`, `audience` = `https://api.anthropic.com`, `claims.repository_owner` = `<계정>`
   - `oauth_scope` = `workspace:inference` 권장(메시지·모델 조회만), `token_lifetime_seconds` = 600
2. GitHub 저장소 → **Settings → Secrets and variables → Actions**
   - Variables: `ANTHROPIC_FEDERATION_RULE_ID`, `ANTHROPIC_ORGANIZATION_ID`, `ANTHROPIC_SERVICE_ACCOUNT_ID`, `ANTHROPIC_WORKSPACE_ID`(선택), `ANTHROPIC_OIDC_AUDIENCE`(선택)
   - Secret: `TOKEN_PASSPHRASE` (임의의 긴 문구)
3. `.github/workflows/claude-token.yml` 을 기본 브랜치(main 또는 master)에 push

### 사용
1. [설정] → **토큰 발급 (GitHub Actions)** 링크(GitHub Pages에서 자동 표시) → **Run workflow**
2. 실행 완료 후 Summary의 `TNTOK1.…` 코드를 복사 → [설정] 액세스 토큰 칸에 붙여넣기, 암호 문구 입력 → 저장
3. [AI 초안 생성] — 토큰 만료(기본 10분) 시 1번부터 반복

- 평문 토큰은 로그·Summary 어디에도 출력되지 않으며(마스킹 + 암호화), 브라우저에는 만료시각과 함께 보관되고 만료 시 자동 삭제됩니다.
- `/v1/oauth/token` 응답 JSON이나 `sk-ant-oat01-…` 평문 토큰을 직접 붙여넣어도 됩니다. `sk-ant-api…` API Key는 거부합니다.
- **키 없이**: [프롬프트 복사] → claude.ai 등에 붙여넣기 → 응답 전체를 [결과 붙여넣기]에 넣으면 1~6번이 자동 입력됩니다.
- AI가 제시한 **출처는 반드시 원문을 확인**한 뒤 저장하십시오.

## 브라우저 지원
| 브라우저 | 동작 |
|---|---|
| Chrome / Edge 86+ | 로컬 폴더 직접 저장·수정·삭제 (File System Access API) |
| Firefox / Safari | 브라우저 저장소(IndexedDB) 보관 + 저장 시 다운로드 폴더로 .txt 내보내기 |

## 구조
```
index.html            화면
assets/style.css      스타일(A4 미리보기·인쇄 포함)
assets/js/storage.js  저장소(로컬 폴더 / 브라우저 저장소), 마지막 폴더 기억
assets/js/doc.js      txt 작성·해석, A4 렌더링
assets/js/ai.js       AI 초안 생성·프롬프트·OIDC 토큰 복호화
.github/workflows/claude-token.yml  OIDC → Claude 단기 토큰 발급(암호화)
assets/js/app.js      화면 제어(CRUD·검색·미리보기)
samples/              예시 노트
```

## 단축키
`Ctrl+S` 저장 · `Ctrl+K` 검색 · `Ctrl+B` 굵게 · 검색창 `Enter` 첫 결과 열기(없으면 새로 작성)

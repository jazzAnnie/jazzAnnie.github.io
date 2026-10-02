/* TechNote - AI 초안 생성 (Anthropic Claude API, 선택 기능)
 * 인증: Workload Identity Federation(OIDC)으로 발급한 단기 액세스 토큰(sk-ant-oat01-…)을 Bearer로 사용 (API Key 미사용)
 *   GitHub Actions "Claude token (OIDC)" 실행 → 요약의 암호화 코드(TNTOK1.…) → [설정]에 붙여넣기 → 복호화 후 사용
 * 토큰이 없으면 [프롬프트 복사] → claude.ai 등에 붙여넣기 → [결과 붙여넣기] 방식으로 사용
 */
(function () {
  'use strict';

  const API = 'https://api.anthropic.com/v1';
  const DEFAULT_MODEL = 'claude-sonnet-4-5';

  const RULES = `당신은 IT기술사 시험 전문 강사이자 ICT 아키텍트입니다.
주어진 IT 기술에 대해 "A4 1페이지 이내" 학습 노트를 작성하십시오.
반드시 아래 6개 섹션 형식만 출력하십시오. 머리말·맺음말·코드블록(\`\`\`)·마크다운 제목(#)은 쓰지 마십시오.

1. (개념)
20자 이내 한 문장(공백 포함, ** 기호 제외), 명사형 종결. 핵심 키워드 1~2개를 **키워드** 로 감쌈.

2. (배경)
왜 이 기술이 등장했는지. "- " 로 시작하는 2~3줄, 줄당 70자 이내. (기존 기술의 한계, 환경 변화, 정책·표준 동향)

3. (목적)
어떤 문제를 해결하기 위함인지. "- " 로 시작하는 2~3줄, 줄당 70자 이내. (해결 문제 → 기대효과)

4. (도식화)
핵심 구성 또는 동작과정을 텍스트 도식으로 5~10줄. 가로 60칸 이내(한글 1자=2칸).
상자는 [ ], 흐름은 --> | v ^ 사용. 상자 안 라벨은 짧은 영문 약어 위주로 하여 줄맞춤이 깨지지 않게 함.
마지막 줄에 "* " 로 시작하는 한 줄 동작 요약.

5. (유사기술)
정확히 3줄, "- 기술명 : 차이점" 형식, 차이점은 45자 이내.

6. (출처)
설명 작성의 근거가 된 문서 3~5건. "- " 로 시작하고 "문서명, 발행기관/저자, 연도, (URL 또는 표준번호)" 형식.
국제표준(ISO/IEC, ITU-T, IETF RFC), NIST SP, 국내 법령·가이드라인(과기정통부, KISA, TTA 등), 원 논문을 우선.
실제로 존재하는 문서만 기재하고, 확실하지 않은 URL·번호는 쓰지 말 것.

공통 규칙: 각 섹션에서 핵심 키워드는 **굵게**, 전문용어는 한글(English) 병기, 2024~2026년 최신 동향 반영, 개조식 명사형 종결.

출력 예시:
1. (개념)
**지속 검증** 기반 **무신뢰** 보안 모델

2. (배경)
- **경계 보안(Perimeter Security)** 한계: 클라우드·원격근무로 내부/외부 경계 소멸
...

6. (출처)
- NIST SP 800-207 Zero Trust Architecture, NIST, 2020
...`;

  function buildPrompt(name) {
    return RULES + '\n\n기술명: ' + name;
  }

  function headers(token) {
    return {
      'content-type': 'application/json',
      'authorization': 'Bearer ' + token,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    };
  }

  function apiError(res, j) {
    if (res.status === 401) return new Error('액세스 토큰이 만료되었거나 유효하지 않습니다. GitHub Actions에서 토큰을 다시 발급하세요.');
    if (res.status === 403) return new Error('토큰 권한(scope) 부족 — 연동 규칙의 oauth_scope를 확인하세요. (' + ((j.error && j.error.message) || 'HTTP 403') + ')');
    return new Error((j.error && j.error.message) || ('HTTP ' + res.status));
  }

  async function generate({ token, model, name }) {
    const res = await fetch(API + '/messages', {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        max_tokens: 2500,
        system: RULES,
        messages: [{ role: 'user', content: '기술명: ' + name }]
      })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw apiError(res, j);
    return (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
  }

  async function listModels(token) {
    const res = await fetch(API + '/models?limit=100', { headers: headers(token) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw apiError(res, j);
    return (j.data || []).map(m => ({ id: m.id, name: m.display_name || m.id }));
  }

  /* 붙여넣은 토큰 해석 → { token, expiresAt(ms|0), scope }
   *  1) TNTOK1.<salt>.<iv>.<ciphertext> : 워크플로가 AES-256-GCM(PBKDF2-SHA256 200,000회)으로 암호화한 코드
   *  2) {"access_token": "...", "expires_in": 600} : /v1/oauth/token 응답 JSON
   *  3) sk-ant-oat01-... : 평문 토큰(만료시각 미상)
   */
  const b64uDec = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
  async function importToken(text, passphrase) {
    const v = (text || '').trim();
    if (!v) throw new Error('토큰이 비어 있습니다.');
    if (v.startsWith('TNTOK1.')) {
      const p = v.split('.');
      if (p.length !== 4) throw new Error('토큰 코드 형식이 올바르지 않습니다.');
      if (!passphrase) throw new Error('암호 문구(TOKEN_PASSPHRASE)를 입력하세요.');
      if (!crypto.subtle) throw new Error('이 환경에서는 복호화를 지원하지 않습니다(HTTPS 또는 localhost 필요).');
      const enc = new TextEncoder();
      const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
      const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64uDec(p[1]), iterations: 200000, hash: 'SHA-256' },
        base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      let plain;
      try { plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64uDec(p[2]) }, key, b64uDec(p[3])); }
      catch (e) { throw new Error('복호화 실패 — 암호 문구가 다르거나 코드가 손상되었습니다.'); }
      const o = JSON.parse(new TextDecoder().decode(plain));
      return { token: o.t, expiresAt: o.e || 0, scope: o.s || '' };
    }
    if (v.startsWith('{')) {
      const o = JSON.parse(v);
      if (!o.access_token) throw new Error('JSON에 access_token이 없습니다.');
      return { token: o.access_token, expiresAt: o.expires_in ? Date.now() + o.expires_in * 1000 : 0, scope: o.scope || '' };
    }
    if (v.startsWith('sk-ant-oat')) return { token: v, expiresAt: 0, scope: '' };
    if (v.startsWith('sk-ant-api')) throw new Error('API Key는 사용하지 않습니다. OIDC로 발급한 액세스 토큰(sk-ant-oat01-…)을 넣으세요.');
    throw new Error('알 수 없는 토큰 형식입니다. TNTOK1.… 코드 또는 sk-ant-oat01-… 토큰을 넣으세요.');
  }

  window.TNAI = { DEFAULT_MODEL, buildPrompt, generate, listModels, importToken };
})();

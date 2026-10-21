# 포케타마 2.0 — GitHub Pages 배포용 배틀 프리뷰

레트로 픽셀풍 *레이아웃*과 라이츄 vs 리자몽 전투를 보여주는 초기 프로토타입입니다. 포켓몬 스프라이트 대신 이모지를 사용합니다. 실제 포켓몬 그래픽·진화·레벨업·저장·관장전은 아직 없습니다.

## 배포하기
1. GitHub에서 새로운 **Public** repository (`poketama-2`)를 만듭니다.
2. 이 폴더 **안의 모든 파일** (`index.html`, `style.css`, `app.js`, `battle-engine.mjs`, `README.md`)을 저장소 **최상위(root)**에 업로드해 커밋합니다. ZIP 파일 자체를 업로드하면 안 됩니다.
3. GitHub 저장소 **Settings → Pages → Build and deployment → Source: Deploy from a branch**를 선택합니다.
4. Branch `main`, 폴더 `/(root)`를 선택하고 **Save**합니다.
5. 잠시 후 `https://본인아이디.github.io/poketama-2/` 주소에서 접속합니다.

## 현재 구현 범위 및 한계
- 기술 PP, 명중, 크리티컬, 반동, 수면, 독, 마비, 강화, 회복약: `battle-engine.mjs` 기본 구현
- 현재 데모에서는 라이츄 기술 4개, 상대 리자몽 기술 2개, 회복약 3개 사용
- 엔진은 설계 초기 버전으로 모든 필살기와 보스전 규칙은 아직 완성되지 않았습니다.
- HTML 파일을 직접 더블클릭하면 모듈 CORS 보안 제한으로 작동하지 않을 수 있습니다. GitHub Pages 또는 로컬 웹서버로 테스트하세요.

코드 및 이미지는 사내 저장소에서 가져오지 않은 별도 프로토타입입니다.

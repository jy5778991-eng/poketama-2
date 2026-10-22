# 포케타마 2.0 코드 구조

일반 정적 GitHub Pages 사이트이며 브라우저 ES 모듈을 사용합니다. 별도 빌드 과정이 없습니다.

## 실행 흐름
- `index.html` — 화면 마크업, CSS와 JS 진입점
- `app.js` — 화면 전환, 배틀 진행, 저장 상태 및 모듈 조립
- `battle-engine.mjs` — 순수 전투 규칙(대미지, 포획, 턴 처리)
- `js/data/pokemon.js` — 스타팅·진화·기술 습득 데이터
- `js/data/areas.js` — 초원·숲 등장 포켓몬, 도감 기초 및 포획 배율
- `js/data/trainers.js` — 라이벌 그린과 관장 웅
- `js/data/items.js` — 상점 아이템과 가방 종류
- `js/storage.js` — 저장 데이터 키 및 불러오기 검증 함수
- `js/sprites.js` — PokeAPI의 포켓몬 이미지 주소
- `js/collection.js` — 도감·업적·트레이너 수집 화면 출력
- `js/inventory.js` — 가방·상점 아이템 목록과 사용/구매 UI
- `js/developer.js` — 개발자 지역 이동 유효성 검사 및 해금 조건

## 스타일
`style.css`는 아래 파일을 순서대로 불러오는 진입점입니다. **CSS 우선순위 보존을 위해 import 순서를 바꾸지 마세요.**
1. `css/base.css`
2. `css/home.css`
3. `css/battle-ui.css`
4. `css/menus.css`
5. `css/areas.css`
6. `css/collection.css`

## 저장 데이터
- 기존 `localStorage` 키 **`poketama-2-progress-v2` 유지**
- 레벨, 경험치, 보유금, 개체값, 기술, 포획/발견 기록, 지역과 보스 클리어, 인벤토리, HP/부상 데이터를 계속 호환합니다.
- 새 기능 추가 시 기존 저장 필드가 없는 경우 기본값으로 마이그레이션해야 합니다.

## 작업 방식
1. 해당 기능의 모듈 및 CSS부터 수정합니다.
2. 상태를 바꾸는 부분은 `app.js`의 저장/화면 처리와 연결합니다.
3. 구문 검사, import/export 존재 검사, CSS 블록 균형 검사를 진행합니다.
4. 브라우저에서 스타팅·야생배틀·포획·가방/상점·수집·개발자모드를 회귀 확인합니다.

남은 `app.js`의 배틀 연출 및 화면 상태 관리 코드는 서로 결합돼 있어, 무리해서 한 번에 분리하지 않고 추후 기능별로 검증하며 옮깁니다.

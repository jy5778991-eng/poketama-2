# 시작의 초원 이전 배경 백업

2026-11-04 새 커스텀 도트 배경으로 교체 전 사용한 배경의 원본 주소 및 CSS 설정입니다.

- 원본 이미지: https://play.pokemonshowdown.com/fx/bg-meadow.png
- 메인과 배틀 공통: `background-image:url('https://play.pokemonshowdown.com/fx/bg-meadow.png'),linear-gradient(180deg,#a2d8e5 0%,#b4d7ac 56%,#70aa64 100%)`
- `background-position:center`
- `background-size:cover`
- `background-repeat:no-repeat`

다시 원래 모습으로 되돌리고 싶으면 `css/areas.css`의 `.home-sprite-wrap.area-grass`와 `#battleScreen .arena.area-grass`의 배경 이미지 선언을 위 값으로 복원합니다.

**참고:** 이 백업은 외부 원본 이미지의 URL과 표시 설정을 보존한 것이며 이미지 파일 자체를 저장소에 복제한 것은 아닙니다.

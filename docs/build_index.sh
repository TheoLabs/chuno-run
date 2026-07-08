#!/usr/bin/env bash
# docs/ 하위의 모든 HTML 문서를 스캔해서 네비게이션용 index.html을 재생성한다.
# 문서를 추가/수정한 뒤 `bash docs/build_index.sh`를 실행하면 index가 최신 상태로 갱신된다.
set -euo pipefail

DOCS_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DOCS_DIR/index.html"

# 폴더명 → 표시 라벨 (없으면 폴더명 그대로)
label_for() {
  case "$1" in
    plans)        echo "기획서" ;;
    wireframes)   echo "와이어프레임" ;;
    issues)       echo "이슈" ;;
    domain)       echo "도메인 설계" ;;
    architecture) echo "아키텍처" ;;
    *)            echo "$1" ;;
  esac
}

# 카테고리 표시 순서 (여기 없는 폴더는 뒤에 알파벳순으로 붙는다)
PREFERRED="plans wireframes issues domain architecture"

# HTML <title> 추출, 없으면 파일명
title_of() {
  local t
  t="$(grep -o -i '<title>[^<]*</title>' "$1" 2>/dev/null | head -1 | sed -E 's/<[^>]+>//g' | sed -E 's/^ *| *$//g' || true)"
  [ -z "$t" ] && t="$(basename "$1" .html)"
  printf '%s' "$t"
}

esc() { sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g'; }

# docs 바로 아래의 서브 디렉터리 목록 수집
ALL_DIRS=()
while IFS= read -r d; do [ -n "$d" ] && ALL_DIRS+=("$d"); done < <(find "$DOCS_DIR" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort)

# 표시 순서 구성: PREFERRED 중 존재하는 것 먼저, 나머지 알파벳순
ORDER=()
if [ "${#ALL_DIRS[@]}" -gt 0 ]; then
  for p in $PREFERRED; do
    for d in "${ALL_DIRS[@]}"; do [ "$d" = "$p" ] && ORDER+=("$d"); done
  done
  for d in "${ALL_DIRS[@]}"; do
    case " $PREFERRED " in *" $d "*) : ;; *) ORDER+=("$d") ;; esac
  done
fi

BODY=""
TOTAL=0
for dir in ${ORDER[@]+"${ORDER[@]}"}; do
  files=()
  while IFS= read -r f; do [ -n "$f" ] && files+=("$f"); done < <(find "$DOCS_DIR/$dir" -maxdepth 1 -type f -name '*.html' ! -name 'index.html' | sort)
  [ "${#files[@]}" -eq 0 ] && continue
  label="$(label_for "$dir" | esc)"
  BODY+="      <section class=\"cat\">
        <h2>${label} <span class=\"count\">${#files[@]}</span></h2>
        <div class=\"grid\">
"
  for f in "${files[@]}"; do
    rel="$dir/$(basename "$f")"
    title="$(title_of "$f" | esc)"
    BODY+="          <a class=\"card\" href=\"${rel}\">
            <span class=\"card-title\">${title}</span>
            <span class=\"card-path\">${rel}</span>
          </a>
"
    TOTAL=$((TOTAL+1))
  done
  BODY+="        </div>
      </section>
"
done

if [ -z "$BODY" ]; then
  BODY="      <p class=\"empty\">아직 문서가 없습니다. planner → wireframer / issue-maker 순으로 기획을 진행하면 여기에 자동으로 쌓입니다.</p>
"
fi

cat > "$OUT" <<HTML
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>문서 인덱스</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 2.5rem 1.5rem; line-height: 1.5;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", sans-serif;
    background: #f6f7f9; color: #1a1a1a;
  }
  .wrap { max-width: 920px; margin: 0 auto; }
  header { margin-bottom: 2rem; }
  h1 { font-size: 1.6rem; margin: 0 0 .3rem; }
  .sub { color: #6b7280; font-size: .9rem; }
  .cat { margin-top: 2rem; }
  h2 { font-size: 1.05rem; margin: 0 0 .8rem; display: flex; align-items: center; gap: .5rem; }
  .count { font-size: .7rem; font-weight: 600; color: #6b7280; background: rgba(0,0,0,.06); padding: .1rem .5rem; border-radius: 999px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: .75rem; }
  .card {
    display: flex; flex-direction: column; gap: .3rem; text-decoration: none;
    padding: .9rem 1rem; border-radius: 10px; background: #fff;
    border: 1px solid rgba(0,0,0,.08); transition: border-color .15s, transform .15s;
  }
  .card:hover { border-color: #6366f1; transform: translateY(-1px); }
  .card-title { font-weight: 600; color: #111827; }
  .card-path { font-size: .72rem; color: #9ca3af; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; word-break: break-all; }
  .empty { color: #6b7280; }
  @media (prefers-color-scheme: dark) {
    body { background: #0f1115; color: #e5e7eb; }
    .sub, .count, .card-path { color: #9ca3af; }
    .count { background: rgba(255,255,255,.08); }
    .card { background: #181b21; border-color: rgba(255,255,255,.08); }
    .card-title { color: #f3f4f6; }
    .empty { color: #9ca3af; }
  }
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>문서 인덱스</h1>
      <div class="sub">기획 · 와이어프레임 · 이슈 · 도메인 · 아키텍처 문서 (총 ${TOTAL}건)</div>
    </header>
    <main>
${BODY}    </main>
  </div>
</body>
</html>
HTML

echo "index 재생성 완료: $OUT (총 ${TOTAL}건)"

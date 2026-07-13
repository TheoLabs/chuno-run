# chuno-run

## Issue Board 연동

이 프로젝트의 기획·이슈는 issue-board(`http://localhost:4000/mcp`, MCP 서버 `issue-board`)로
관리된다.

### 멀티기기 주의 — 프로젝트는 `repoPath`가 아니라 **이름/ID로 식별**한다

이 저장소는 여러 기기에서 작업되며, 기기마다 절대경로(`repoPath`)가 다르다
(예: `/Users/theo/vscode/chuno-run`, `/Users/jeangho293/vscode/chuno-run`).
`get_project_context(repoPath)`는 **경로가 정확히 일치할 때만** 매칭되므로, 경로에
의존하지 말고 아래 불변 식별자로 프로젝트를 찾는다.

- **프로젝트 이름**: `추노`
- **프로젝트 ID**: `cmrby3y0000001znnofoo0a53`

**작업 시작 전 컨텍스트 로딩 절차:**
1. `list_projects`로 전체 목록을 받아 이름 `추노`(또는 위 ID)에 해당하는 프로젝트와
   그 `repoPath`를 찾는다.
2. 그 `repoPath`를 그대로 `get_project_context(repoPath=<찾은 값>)`에 넘겨 기획서·이슈를 읽는다.
3. 현재 작업 디렉토리와 등록된 `repoPath`가 다르면 그건 정상(다른 기기에서 등록된 것)이다.
   경로를 새로 덮어쓰거나 프로젝트를 새로 만들지 말고, 위에서 찾은 프로젝트를 그대로 사용한다.
4. 이름/ID로도 프로젝트가 없으면 그때만 새 프로젝트다 — `/ib-generate <아이디어>`로 시작한다.
- **이슈 착수 시**: 해당 이슈를 `update_issue_status(issueId, "in_progress")`로 표시.
- **완료 조건 체크박스 동기화**: 이슈 본문의 "완료 조건" 항목을 실제로 끝낼 때마다
  `get_issue`로 본문을 읽어 해당 `- [ ]`를 `- [x]`로 바꿔 `update_issue(issueId, body=<수정본>)`로
  저장한다. **본문의 다른 부분은 건드리지 마라.** (한 번에 재조정하려면 `/ib-progress`.)
- **이슈 완료 시**: 완료 조건을 모두 `- [x]`로 맞추고 `update_issue_status(issueId, "done")`.
- **작업 중 새 할 일 발견 시**: `create_issue`로 등록해 보드에 남긴다.
- **기획에 결정/변경이 생기면**: `append_plan_note`로 기획서에 진행 메모를 덧붙인다.

아직 기획이 없다면 `/ib-generate <아이디어>`(또는 `/ib-plan`)로 시작한다.
MCP 툴이 보이지 않으면 issue-board 서버가 떠 있는지, 첫 사용 시 MCP 승인을 했는지 확인하라.

# chuno-run

## Issue Board 연동

이 프로젝트의 기획·이슈는 issue-board(`http://localhost:4000/mcp`, MCP 서버 `issue-board`)로
관리된다. 이 저장소의 `repoPath`는 `/Users/theo/vscode/chuno-run` 이다.

- **작업 시작 전**: `get_project_context(repoPath="/Users/theo/vscode/chuno-run")`로
  기획서와 이슈를 읽어 현재 맥락을 파악한다.
- **이슈 착수 시**: 해당 이슈를 `update_issue_status(issueId, "in_progress")`로 표시.
- **이슈 완료 시**: `update_issue_status(issueId, "done")`.
- **작업 중 새 할 일 발견 시**: `create_issue`로 등록해 보드에 남긴다.
- **기획에 결정/변경이 생기면**: `append_plan_note`로 기획서에 진행 메모를 덧붙인다.

아직 기획이 없다면 `/ib-generate <아이디어>`(또는 `/ib-plan`)로 시작한다.
MCP 툴이 보이지 않으면 issue-board 서버가 떠 있는지, 첫 사용 시 MCP 승인을 했는지 확인하라.

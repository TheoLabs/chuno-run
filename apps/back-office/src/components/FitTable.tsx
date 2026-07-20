import { Table } from "antd";
import type { TableProps } from "antd";

/**
 * 남은 세로 공간을 채우고 본문만 내부 스크롤하는 Table.
 * 부모는 flex 컬럼이어야 하며(`display:flex; flex-direction:column; min-height:0`),
 * 실제 높이 계산은 index.css 의 `.fit-table` 규칙이 맡는다.
 *
 * antd 는 `scroll.y` 가 있을 때만 header/body 를 분리해 그리므로 자리값 1을 넘긴다.
 * (인라인 max-height 는 CSS 에서 무력화)
 */
export function FitTable<T extends object>({ scroll, ...rest }: TableProps<T>) {
  return (
    <div className="fit-table">
      <Table<T> {...rest} scroll={{ y: 1, ...scroll }} />
    </div>
  );
}

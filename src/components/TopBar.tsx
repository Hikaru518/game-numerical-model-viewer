type TopBarProps = {
  dirty: boolean;
  creatingRelationship: boolean;
  pendingFromId: string | null;
  onImport: () => void;
  onExport: () => void;
  onFitView: () => void;
  onFocusSelection: () => void;
};

const TopBar = ({
  dirty,
  creatingRelationship,
  pendingFromId,
  onImport,
  onExport,
  onFitView,
  onFocusSelection,
}: TopBarProps) => {
  const relationshipHint = creatingRelationship
    ? pendingFromId
      ? "已选起点，点击终点对象"
      : "点击画布对象选择起点"
    : null;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="app-icon" />
        <div>
          <div className="app-title">数值模型可视化编辑器</div>
          <div className="app-subtitle">导入/导出 JSON · 画布拖拽 · 影响链追踪</div>
        </div>
      </div>
      <div className="topbar-right">
        {dirty && <div className="dirty-badge">未导出更改</div>}
        {relationshipHint && <div className="hint-badge">{relationshipHint}</div>}
        <button className="btn ghost" onClick={onImport}>
          导入 JSON
        </button>
        <button className="btn ghost" onClick={onExport}>
          导出 JSON
        </button>
        <button className="icon-btn" onClick={onFitView} aria-label="适配内容">
          适配
        </button>
        <button className="icon-btn" onClick={onFocusSelection} aria-label="聚焦选中">
          聚焦
        </button>
      </div>
    </header>
  );
};

export default TopBar;

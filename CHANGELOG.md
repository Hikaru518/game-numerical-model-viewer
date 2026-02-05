# Changelog

本项目的所有重要改动都会记录在此文件中。

## 0.0.1 - 2026-02-05 

### Added

- **React + Vite + TypeScript 前端工程**：代码位于 `src/`。
- **画布编辑器（React Flow）**：Object/Relationship 渲染、平移/缩放、适配内容、聚焦选中。
- **导入/导出 JSON（P0 校验）**：阻止导入策略；错误提示包含字段路径与相关 id，并用弹窗展示。
- **空画布引导**：Canvas 中央 CTA（导入 JSON / 新建模型）。
- **SidePanel 详情与编辑**
  - Object：名称、简介、Attributes（名称/简介/公式，多行公式）、影响对象分组（Incoming/Outgoing/Undirected）、相关关系列表跳转。
  - Relationship：名称/描述/arrowType/label/方向编辑（fromId/toId）。
- **公式复制**：Attributes 中支持一键复制公式（保留换行）。
- **dirty 状态与离开提醒**：编辑或拖拽布局后标记未导出更改；刷新/关闭前提示。
- **创建 Relationship 的引导提示**：选择起点/终点时在 TopBar 显示提示。
- **删除功能**：选中 Object/Relationship 后可删除，并支持键盘快捷键。

### Changed

- **边 label 展示**：限制最大宽度并支持自动换行，最多显示两行以避免过长。

### Fixed

- **Relationship 线条不显示**：为自定义 Object 节点补齐 React Flow `Handle`，确保边可正确连接渲染。
- **删除快捷键兼容 macOS**：同时支持 `Delete` 与 `Backspace` 触发删除（输入框内不触发）。
- **边命中区域**：扩大 edge interaction 区域，提升可点击/hover 体验。

### Notes

- **删除对象策略**：若对象仍存在关联 Relationship，则提示并阻止删除（需先删除关系）。


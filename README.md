# Game Numerical Model Viewer

游戏数值模型可视化编辑器（内部工具）。将 **Object / Attribute / Relationship** 以画布方式可视化与编辑，并支持从/到外置 JSON 导入/导出。

## Features

- **画布编辑**：Object 卡片 + Relationship 连线（支持 `single / double / none` 箭头），支持平移/缩放、适配内容、聚焦选中。
- **SidePanel 详情编辑**：
  - Object：名称、简介、Attributes（名称/简介/公式，多行公式），影响对象分组（Incoming/Outgoing/Undirected），相关关系跳转。
  - Relationship：名称/描述/arrowType/label/方向（fromId/toId）。
- **导入/导出 JSON（P0 校验）**：校验 id 唯一性、引用一致性、枚举合法性、结构完整性；导入失败会阻止导入并展示字段路径与 id。
- **关系预览**：Hover 关系线显示 tooltip。
- **未导出提醒**：编辑或拖拽布局后进入 dirty 状态，离开页面会提示。
- **删除**：选中 Object/Relationship 后可删除；删除 Object 若仍有关联 Relationship 会阻止并提示先删关系。

## Quick Start

```bash
npm install
npm run dev
```

然后打开终端输出的本地地址（通常是 `http://localhost:5173`）。

## Data Format (JSON)

最小结构（详见 `src/model/types.ts`）：

```json
{
  "schemaVersion": 1,
  "objects": [
    {
      "id": "obj_1",
      "name": "Sales",
      "description": "",
      "attributes": [
        {
          "name": "orders",
          "description": "",
          "formula": "demand * conversionRate"
        }
      ]
    }
  ],
  "relationships": [
    {
      "id": "rel_1",
      "name": "Price affects Sales",
      "description": "",
      "fromId": "obj_price",
      "toId": "obj_sales",
      "arrowType": "single",
      "label": "需求弹性"
    }
  ]
}
```

## Development

- `npm run dev`：本地开发
- `npm run build`：构建
- `npm run preview`：预览构建产物
- `npm run lint`：Lint
- `npm run typecheck`：TypeScript 类型检查
- `npm run validate`：一键验证（lint + tests + build）


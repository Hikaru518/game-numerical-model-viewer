import { useEffect, useState } from "react";
import type { ObjectEntity, Relationship, ArrowType } from "../model/types";

type Selection =
  | { type: "object"; id: string }
  | { type: "relationship"; id: string }
  | null;

type SidePanelProps = {
  objects: ObjectEntity[];
  relationships: Relationship[];
  selection: Selection;
  onSelectRelationship: (id: string) => void;
  onUpdateObject: (id: string, updater: Partial<ObjectEntity>) => void;
  onUpdateRelationship: (id: string, updater: Partial<Relationship>) => void;
  onAddAttribute: (objectId: string) => void;
  onUpdateAttribute: (
    objectId: string,
    index: number,
    updater: Partial<ObjectEntity["attributes"][0]>
  ) => void;
  onFocusObject: (id: string) => void;
  onDeleteObject: (id: string) => void;
  onDeleteRelationship: (id: string) => void;
};

const arrowOptions: { value: ArrowType; label: string }[] = [
  { value: "single", label: "单箭头" },
  { value: "double", label: "双箭头" },
  { value: "none", label: "无箭头" },
];

const SidePanel = ({
  objects,
  relationships,
  selection,
  onSelectObject,
  onSelectRelationship,
  onUpdateObject,
  onUpdateRelationship,
  onAddAttribute,
  onUpdateAttribute,
  onFocusObject,
  onDeleteObject,
  onDeleteRelationship,
}: SidePanelProps) => {
  const findObject = (id: string) => objects.find((obj) => obj.id === id);
  const findRelationship = (id: string) =>
    relationships.find((rel) => rel.id === id);

  const object = selection?.type === "object" ? findObject(selection.id) : null;
  const relationship =
    selection?.type === "relationship" ? findRelationship(selection.id) : null;
  const [attributesCollapsed, setAttributesCollapsed] = useState(false);

  useEffect(() => {
    if (selection?.type === "object") {
      setAttributesCollapsed(false);
    }
  }, [selection?.type, selection?.id]);

  if (!selection) {
    return (
      <aside className="side-panel">
        <div className="panel-empty-title">未选择任何对象/关系</div>
        <div className="panel-empty-desc">
          你可以先导入 JSON 或新建模型。导入后：点击对象查看属性/公式；点击关系查看箭头类型与方向。
        </div>
        <div className="panel-tips">
          <div className="panel-tips-title">快速操作</div>
          <div className="panel-tip">拖拽画布空白区域可平移</div>
          <div className="panel-tip">滚轮/触控板可缩放</div>
          <div className="panel-tip">拖动对象整理布局，连线实时跟随</div>
        </div>
      </aside>
    );
  }

  if (selection.type === "object" && object) {
    const relatedRelationships = relationships.filter(
      (rel) => rel.fromId === object.id || rel.toId === object.id
    );

    const incoming: string[] = [];
    const outgoing: string[] = [];
    const undirected: string[] = [];

    relatedRelationships.forEach((rel) => {
      if (rel.arrowType === "none") {
        const otherId = rel.fromId === object.id ? rel.toId : rel.fromId;
        if (otherId) undirected.push(otherId);
        return;
      }

      if (rel.arrowType === "double") {
        const otherId = rel.fromId === object.id ? rel.toId : rel.fromId;
        if (otherId) {
          incoming.push(otherId);
          outgoing.push(otherId);
        }
        return;
      }

      if (rel.arrowType === "single") {
        if (rel.toId === object.id) {
          incoming.push(rel.fromId);
        }
        if (rel.fromId === object.id) {
          outgoing.push(rel.toId);
        }
      }
    });

    const renderObjectList = (ids: string[]) => {
      if (ids.length === 0) {
        return <div className="panel-muted">无</div>;
      }
      return ids.map((id) => {
        const obj = findObject(id);
        return (
          <button
            key={id}
            className="panel-chip"
            onClick={() => onFocusObject(id)}
          >
            {obj?.name || id}
          </button>
        );
      });
    };

    return (
      <aside className="side-panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">{object.name || "未命名对象"}</div>
            <div className="panel-subtitle">id: {object.id}</div>
          </div>
          <div className="panel-header-actions">
            <button
              className="btn danger compact"
              onClick={() => onDeleteObject(object.id)}
            >
              删除
            </button>
          </div>
        </div>

        <div className="panel-section">
          <div className="section-title">名称</div>
          <input
            className="panel-input"
            placeholder="填写对象名称"
            value={object.name}
            onChange={(event) =>
              onUpdateObject(object.id, { name: event.target.value })
            }
          />
        </div>

        <div className="panel-section">
          <div className="section-title">简介</div>
          <textarea
            className="panel-textarea"
            placeholder="填写对象简介"
            value={object.description}
            onChange={(event) =>
              onUpdateObject(object.id, { description: event.target.value })
            }
          />
        </div>

        <div className="panel-section">
          <div className="section-header">
            <div className="section-title">Attributes</div>
            <div className="section-actions">
              <button
                className="btn ghost compact"
                onClick={() => setAttributesCollapsed((prev) => !prev)}
              >
                {attributesCollapsed ? "展开" : "折叠"}
              </button>
              <button
                className="icon-btn small"
                onClick={() => onAddAttribute(object.id)}
              >
                +
              </button>
            </div>
          </div>
          {attributesCollapsed ? (
            <div className="panel-muted">已折叠</div>
          ) : (
            <>
              {object.attributes.length === 0 && (
                <div className="panel-muted">暂无属性</div>
              )}
              {object.attributes.map((attr, index) => (
                <div key={`${object.id}-${index}`} className="attribute-card">
                  <div className="attribute-row">
                    <input
                      className="panel-input"
                      placeholder="属性名称"
                      value={attr.name}
                      onChange={(event) =>
                        onUpdateAttribute(object.id, index, { name: event.target.value })
                      }
                    />
                    <button
                      className="btn ghost compact"
                      onClick={() =>
                        navigator.clipboard?.writeText(attr.formula || "")
                      }
                    >
                      复制公式
                    </button>
                  </div>
                  <textarea
                    className="panel-textarea"
                    placeholder="属性简介"
                    value={attr.description}
                    onChange={(event) =>
                      onUpdateAttribute(object.id, index, {
                        description: event.target.value,
                      })
                    }
                  />
                  <textarea
                    className="panel-textarea mono"
                    placeholder="未填写公式"
                    value={attr.formula}
                    onChange={(event) =>
                      onUpdateAttribute(object.id, index, { formula: event.target.value })
                    }
                  />
                </div>
              ))}
              <div className="panel-muted">点击右上角复制公式（保留换行）</div>
            </>
          )}
        </div>

        <div className="panel-section">
          <div className="section-title">影响对象</div>
          <div className="panel-help">
            箭头语义：A → B 表示 A 影响 B（B 依赖 A）
          </div>
          <div className="impact-group">
            <div className="impact-title">Incoming（影响来源）</div>
            <div className="impact-list">{renderObjectList(incoming)}</div>
          </div>
          <div className="impact-group">
            <div className="impact-title">Outgoing（影响的对象）</div>
            <div className="impact-list">{renderObjectList(outgoing)}</div>
          </div>
          <div className="impact-group">
            <div className="impact-title">Undirected（关联）</div>
            <div className="impact-list">{renderObjectList(undirected)}</div>
          </div>
        </div>

        <div className="panel-section">
          <div className="section-title">相关 Relationships</div>
          {relatedRelationships.length === 0 && (
            <div className="panel-muted">无关联关系</div>
          )}
          {relatedRelationships.map((rel) => {
            const fromName = findObject(rel.fromId)?.name || rel.fromId;
            const toName = findObject(rel.toId)?.name || rel.toId;
            const arrow =
              rel.arrowType === "single"
                ? "→"
                : rel.arrowType === "double"
                  ? "↔"
                  : "—";
            return (
              <button
                key={rel.id}
                className="relation-card"
                onClick={() => onSelectRelationship(rel.id)}
              >
                <div className="relation-title">{rel.name || "未命名关系"}</div>
                <div className="relation-desc">
                  label：{rel.label || "未填写"} · {fromName} {arrow} {toName}
                </div>
              </button>
            );
          })}
        </div>
      </aside>
    );
  }

  if (selection.type === "relationship" && relationship) {
    const fromName = findObject(relationship.fromId)?.name || relationship.fromId;
    const toName = findObject(relationship.toId)?.name || relationship.toId;

    return (
      <aside className="side-panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">{relationship.name || "未命名关系"}</div>
            <div className="panel-subtitle">id: {relationship.id}</div>
          </div>
          <div className="panel-header-actions">
            <button
              className="btn danger compact"
              onClick={() => onDeleteRelationship(relationship.id)}
            >
              删除
            </button>
          </div>
        </div>

        <div className="panel-section">
          <div className="section-title">名称</div>
          <input
            className="panel-input"
            value={relationship.name}
            onChange={(event) =>
              onUpdateRelationship(relationship.id, { name: event.target.value })
            }
          />
        </div>

        <div className="panel-section">
          <div className="section-title">描述</div>
          <textarea
            className="panel-textarea"
            value={relationship.description}
            onChange={(event) =>
              onUpdateRelationship(relationship.id, {
                description: event.target.value,
              })
            }
          />
        </div>

        <div className="panel-section">
          <div className="section-title">箭头类型</div>
          <div className="segment-control">
            {arrowOptions.map((option) => (
              <button
                key={option.value}
                className={`segment-btn ${
                  relationship.arrowType === option.value ? "active" : ""
                }`}
                onClick={() =>
                  onUpdateRelationship(relationship.id, { arrowType: option.value })
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <div className="section-title">label</div>
          <input
            className="panel-input"
            value={relationship.label}
            onChange={(event) =>
              onUpdateRelationship(relationship.id, { label: event.target.value })
            }
          />
        </div>

        <div className="panel-section">
          <div className="section-title">方向</div>
          <div className="direction-row">
            <select
              className="panel-select"
              value={relationship.fromId}
              onChange={(event) =>
                onUpdateRelationship(relationship.id, { fromId: event.target.value })
              }
            >
              {objects.map((obj) => (
                <option key={obj.id} value={obj.id}>
                  {obj.name || obj.id}
                </option>
              ))}
            </select>
            <span className="direction-arrow">→</span>
            <select
              className="panel-select"
              value={relationship.toId}
              onChange={(event) =>
                onUpdateRelationship(relationship.id, { toId: event.target.value })
              }
            >
              {objects.map((obj) => (
                <option key={obj.id} value={obj.id}>
                  {obj.name || obj.id}
                </option>
              ))}
            </select>
          </div>
          <div className="panel-muted">
            当前方向：{fromName} → {toName}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="side-panel">
      <div className="panel-empty-title">数据已失效</div>
      <div className="panel-empty-desc">选中对象或关系已不存在。</div>
    </aside>
  );
};

export default SidePanel;

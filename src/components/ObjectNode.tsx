import { Handle, Position, type NodeProps } from "reactflow";
import type { ObjectEntity } from "../model/types";

type ObjectNodeData = {
  object: ObjectEntity;
  isSelected: boolean;
  isPendingSource: boolean;
};

const ObjectNode = ({ data }: NodeProps<ObjectNodeData>) => {
  const { object, isSelected, isPendingSource } = data;
  const attributesPreview = object.attributes
    .map((attr) => attr.name)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");

  return (
    <div
      className={`object-node ${isSelected ? "selected" : ""} ${
        isPendingSource ? "pending" : ""
      }`}
    >
      <Handle
        className="node-handle left"
        type="target"
        position={Position.Left}
      />
      <Handle
        className="node-handle right"
        type="source"
        position={Position.Right}
      />
      <div className="object-node-title">{object.name || "未命名对象"}</div>
      <div className="object-node-desc">
        {object.description || "暂无简介"}
      </div>
      <div className="object-node-attrs">
        {attributesPreview
          ? `Attributes: ${attributesPreview}`
          : "Attributes: 无"}
      </div>
    </div>
  );
};

export default ObjectNode;

# Testing — ReactFlow mock（Vitest + Testing Library）（snapshot）

目标：把 ReactFlow mock 成可控 DOM，从而能稳定测试“用户旅程”（点击 node/edge、触发回调等）。\n
关键点：mock `onInit` 传入的 instance（`fitView/setCenter/getNode`），并 stub `crypto.randomUUID()` 让生成的 id 可预测。

```ts
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import App from "../../App";

vi.mock("reactflow", async () => {
  const React = await import("react");
  const { useEffect } = React;

  type MockNode = {
    id: string;
    position: { x: number; y: number };
    data?: { object?: { name?: string } };
  };

  type MockEdge = { id: string };

  type MockReactFlowInstance = {
    fitView: () => void;
    setCenter: () => void;
    getNode: (
      id: string
    ) => { id: string; position: { x: number; y: number }; width: number; height: number } | undefined;
  };

  type ReactFlowProps = {
    nodes?: MockNode[];
    edges?: MockEdge[];
    onInit?: (instance: MockReactFlowInstance) => void;
    onNodeClick?: (event: unknown, node: MockNode) => void;
    onEdgeClick?: (event: unknown, edge: MockEdge) => void;
    onPaneClick?: () => void;
    children?: ReactNode;
  };

  const ReactFlow = ({
    nodes = [],
    edges = [],
    onInit,
    onNodeClick,
    onEdgeClick,
    onPaneClick,
    children,
  }: ReactFlowProps) => {
    useEffect(() => {
      if (!onInit) return;
      onInit({
        fitView: vi.fn(),
        setCenter: vi.fn(),
        getNode: (id: string) => {
          const match = nodes.find((node) => node.id === id);
          if (!match) return undefined;
          return { id: match.id, position: match.position, width: 220, height: 120 };
        },
      });
    }, [nodes, onInit]);

    return (
      <div data-testid="reactflow" onClick={() => onPaneClick?.()}>
        <div data-testid="reactflow-nodes">
          {nodes.map((node) => (
            <button
              key={node.id}
              data-testid={`node-${node.id}`}
              onClick={(event) => {
                event.stopPropagation();
                onNodeClick?.(event, node);
              }}
            >
              {node.data?.object?.name || node.id}
            </button>
          ))}
        </div>
        <div data-testid="reactflow-edges">
          {edges.map((edge) => (
            <button
              key={edge.id}
              data-testid={`edge-${edge.id}`}
              onClick={(event) => {
                event.stopPropagation();
                onEdgeClick?.(event, edge);
              }}
            >
              {edge.id}
            </button>
          ))}
        </div>
        {children}
      </div>
    );
  };

  return {
    __esModule: true,
    default: ReactFlow,
    ReactFlow,
    ReactFlowProvider: ({ children }: { children?: ReactNode }) => (
      <div data-testid="reactflow-provider">{children}</div>
    ),
    Background: () => <div data-testid="reactflow-background" />,
    Controls: () => <div data-testid="reactflow-controls" />,
    EdgeLabelRenderer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    MarkerType: { ArrowClosed: "arrowclosed" },
    Handle: () => <div data-testid="reactflow-handle" />,
    Position: { Left: "left", Right: "right", Top: "top", Bottom: "bottom" },
    BaseEdge: () => <path data-testid="base-edge" />,
    getBezierPath: () => ["M0 0", 0, 0],
  };
});

const stubCryptoSequence = () => {
  let counter = 0;
  vi.stubGlobal("crypto", {
    randomUUID: () => `uuid-${++counter}`,
  });
};

describe("App integration flows", () => {
  beforeEach(() => {
    stubCryptoSequence();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows empty state and triggers file dialog", async () => {
    const user = userEvent.setup();
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click");

    render(<App />);
    expect(screen.getByText("从这里开始")).toBeInTheDocument();

    const importButtons = screen.getAllByRole("button", { name: "导入 JSON" });
    await user.click(importButtons[0]);

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });
});
```


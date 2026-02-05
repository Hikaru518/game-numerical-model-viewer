import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import App from "../../App";

vi.mock("reactflow", async () => {
  const React = await import("react");
  const { useEffect } = React;

  type MockNode = {
    id: string;
    position: { x: number; y: number };
    data?: { object?: { name?: string }; isPendingSource?: boolean };
  };

  type MockEdge = { id: string };

  type MockReactFlowInstance = {
    fitView: () => void;
    setCenter: () => void;
    getNode: (
      id: string
    ) => { id: string; position: { x: number; y: number }; width: number; height: number } | undefined;
    screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number };
  };

  type ReactFlowProps = {
    nodes?: MockNode[];
    edges?: MockEdge[];
    onInit?: (instance: MockReactFlowInstance) => void;
    onNodeClick?: (event: unknown, node: MockNode) => void;
    onEdgeClick?: (event: unknown, edge: MockEdge) => void;
    onPaneClick?: () => void;
    onPaneContextMenu?: (event: MouseEvent) => void;
    onNodeContextMenu?: (event: MouseEvent, node: MockNode) => void;
    children?: ReactNode;
  };

  const ReactFlow = ({
    nodes = [],
    edges = [],
    onInit,
    onNodeClick,
    onEdgeClick,
    onPaneClick,
    onPaneContextMenu,
    onNodeContextMenu,
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
        screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({ x, y }),
      });
    }, [nodes, onInit]);

    return (
      <div
        data-testid="reactflow"
        onClick={() => onPaneClick?.()}
        onContextMenu={(event) => onPaneContextMenu?.(event.nativeEvent)}
      >
        <div data-testid="reactflow-nodes">
          {nodes.map((node) => (
            <button
              key={node.id}
              data-testid={`node-${node.id}`}
              className={node.data?.isPendingSource ? "mock-pending-source" : undefined}
              data-pending={node.data?.isPendingSource ? "true" : "false"}
              onClick={(event) => {
                event.stopPropagation();
                onNodeClick?.(event, node);
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onNodeContextMenu?.(event.nativeEvent, node);
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

  it("creates an object and updates its name", async () => {
    const user = userEvent.setup();
    render(<App />);

    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 300, clientY: 200 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));

    const nameInput = screen.getByPlaceholderText("填写对象名称");
    await user.clear(nameInput);
    await user.type(nameInput, "角色");

    expect(screen.getByTestId("node-obj_uuid-1")).toHaveTextContent("角色");
  });

  it("creates a relationship by selecting two nodes", async () => {
    const user = userEvent.setup();
    render(<App />);

    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 260, clientY: 180 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));
    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 520, clientY: 220 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));

    fireEvent.contextMenu(screen.getByTestId("node-obj_uuid-1"), { clientX: 260, clientY: 180 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Relationship" }));

    expect(screen.getByTestId("node-obj_uuid-1")).toHaveAttribute("data-pending", "true");
    await user.click(screen.getByTestId("node-obj_uuid-2"));

    expect(screen.getByText("未命名关系")).toBeInTheDocument();
    expect(screen.getByTestId("edge-rel_uuid-3")).toBeInTheDocument();
  });

  it("blocks self relationship creation", async () => {
    const user = userEvent.setup();
    render(<App />);

    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 300, clientY: 200 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));

    fireEvent.contextMenu(screen.getByTestId("node-obj_uuid-1"), { clientX: 300, clientY: 200 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Relationship" }));
    await user.click(screen.getByTestId("node-obj_uuid-1"));

    expect(screen.getByText("无法创建关系")).toBeInTheDocument();
    expect(screen.getByText("起点与终点不能相同")).toBeInTheDocument();
  });

  it("prevents deleting objects with relationships until removed", async () => {
    const user = userEvent.setup();
    render(<App />);

    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 260, clientY: 180 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));
    fireEvent.contextMenu(screen.getByTestId("reactflow"), { clientX: 520, clientY: 220 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Object" }));

    fireEvent.contextMenu(screen.getByTestId("node-obj_uuid-1"), { clientX: 260, clientY: 180 });
    await user.click(screen.getByRole("menuitem", { name: "新建 Relationship" }));
    await user.click(screen.getByTestId("node-obj_uuid-2"));

    await user.click(screen.getByTestId("node-obj_uuid-1"));
    await user.click(screen.getByRole("button", { name: "删除" }));

    expect(screen.getByText("无法删除对象")).toBeInTheDocument();
    const closeButtons = screen.getAllByRole("button", { name: "关闭" });
    await user.click(closeButtons[1]);

    await user.click(screen.getByTestId("edge-rel_uuid-3"));
    await user.click(screen.getByRole("button", { name: "删除" }));

    await user.click(screen.getByTestId("node-obj_uuid-1"));
    await user.click(screen.getByRole("button", { name: "删除" }));

    expect(screen.queryByTestId("node-obj_uuid-1")).not.toBeInTheDocument();
  });
});

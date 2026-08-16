import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import {
  hasNodeCollision,
  layoutNodes,
  resolveNodeCollisions,
} from "../../src/app/features/organization/components/org-tree/orgTreeModel";

const siblingNodes: Node[] = ["planning", "tdfro", "ledipo", "ocib"].map((id) => ({
  id,
  type: "orgNode",
  position: { x: 0, y: 0 },
  data: { name: id },
}));

const siblingEdges: Edge[] = siblingNodes.map((node) => ({
  id: `root-${node.id}`,
  source: "root",
  target: node.id,
}));

describe("organization tree layout", () => {
  it("reserves enough width to keep sibling organization cards separate", () => {
    const root: Node = {
      id: "root",
      type: "orgNode",
      position: { x: 0, y: 0 },
      data: { name: "Ormoc City Government" },
    };
    const laidOutNodes = layoutNodes([root, ...siblingNodes], siblingEdges);

    for (const node of laidOutNodes) {
      expect(hasNodeCollision(node, laidOutNodes)).toBe(false);
    }
  });

  it("pushes colliding cards away while preserving the node the user dragged", () => {
    const nodes: Node[] = [
      { id: "dragged", type: "orgNode", position: { x: 100, y: 100 }, data: {} },
      { id: "first", type: "orgNode", position: { x: 220, y: 100 }, data: {} },
      { id: "second", type: "orgNode", position: { x: 460, y: 100 }, data: {} },
    ];

    const resolved = resolveNodeCollisions(nodes, "dragged");

    expect(resolved.find((node) => node.id === "dragged")?.position).toEqual({ x: 100, y: 100 });
    for (const node of resolved) {
      expect(hasNodeCollision(node, resolved)).toBe(false);
    }
  });
});

import { Seq } from "immutable";

import { Graph } from "../Graph";

const NodeSeq = (nodes: string[]) =>
  Seq(nodes)
    .toKeyedSeq()
    .mapKeys((_, v) => v.toUpperCase());

const undefKey = (undefined as any) as string;

const nodes: [string, string][] = [
  ["H", "h"],
  ["G", "g"],
  ["F", "f"],
  ["E", "e"],
  ["D", "d"],
  ["C", "c"],
  ["B", "b"],
  ["A", "a"],
];
const edges: [string, string, string][] = [
  ["F", "H", "fh"],
  ["F", "G", "fg"],
  ["E", "F", "ef"],
  ["D", "F", "df"],
  ["C", "D", "cd"],
  ["B", "D", "bd"],
  ["A", "C", "ac"],
  ["A", "B", "ab"],
];
const graph = Graph.from(nodes, edges);

describe("Graph structure", () => {
  describe("initializers", () => {
    describe("from()", () => {
      it("returns a Graph containing all passed nodes and edges", () => {
        expect(graph.hasNode("A")).toBeTruthy();
        expect(graph.hasNode("B")).toBeTruthy();
        expect(graph.hasNode("C")).toBeTruthy();
        expect(graph.hasNode("D")).toBeTruthy();
        expect(graph.hasNode("E")).toBeTruthy();
        expect(graph.hasNode("F")).toBeTruthy();
        expect(graph.hasNode("G")).toBeTruthy();
        expect(graph.hasNode("H")).toBeTruthy();

        expect(graph.hasEdge("A", "B")).toBeTruthy();
        expect(graph.hasEdge("A", "C")).toBeTruthy();
        expect(graph.hasEdge("B", "D")).toBeTruthy();
        expect(graph.hasEdge("C", "D")).toBeTruthy();
        expect(graph.hasEdge("D", "F")).toBeTruthy();
        expect(graph.hasEdge("E", "F")).toBeTruthy();
        expect(graph.hasEdge("F", "G")).toBeTruthy();
        expect(graph.hasEdge("F", "H")).toBeTruthy();
      });
    });
  });

  describe("instance methods", () => {
    describe("predecessors()", () => {
      const pre = NodeSeq(["d", "e"]);

      it("returns all nodes with an edge ending at the passed node", () => {
        expect(graph.predecessors("F").equals(pre)).toBeTruthy();
      });
    });

    describe("successors()", () => {
      const suc = NodeSeq(["g", "h"]);

      it("returns all nodes with an edge starting at the passed node", () => {
        expect(graph.successors("F").equals(suc)).toBeTruthy();
      });
    });

    describe("neighbors()", () => {
      const nbr = NodeSeq(["d", "e", "g", "h"]);

      it("returns all of the passed node's neighbors", () => {
        expect(graph.neighbors("F").equals(nbr)).toBeTruthy();
      });

      it("doesn't return any neighbors more than once", () => {
        expect(
          graph
            .connect("H", "F", "hf")
            .neighbors("F")
            .count(),
        ).toBe(4);
      });
    });

    describe("ancestors()", () => {
      const anc = NodeSeq(["a", "b", "c", "d", "e"]);

      console.log(graph.ancestors("F"));

      it("returns all ancestors of the passed node", () => {
        expect(graph.ancestors("F").equals(anc)).toBeTruthy();
      });

      it("doesn't return any ancestors more than once", () => {
        expect(
          graph
            .connect("C", "E", "ce")
            .ancestors("F")
            .count(),
        ).toBe(5);
      });

      it("returns an empty Seq for a missing key", () => {
        expect(graph.ancestors("Z").count()).toBe(0);
        expect(graph.ancestors(undefKey).count()).toBe(0);
      });
    });

    describe("descendants()", () => {
      const des = NodeSeq(["g", "h"]);

      it("returns all descendants of the passed node", () => {
        expect(graph.descendants("F").equals(des)).toBeTruthy();
      });

      it("doesn't return any descendant more than once", () => {
        expect(
          graph
            .setNode("I", "i")
            .connect("G", "I", "gi")
            .connect("H", "I", "hi")
            .descendants("F")
            .count(),
        ).toBe(3);
      });

      it("returns an empty Seq for a missing key", () => {
        expect(graph.descendants("Z").count()).toBe(0);
        expect(graph.descendants(undefKey).count()).toBe(0);
      });
    });

    describe("hasNode()", () => {
      it("returns true for node keys that are present", () => {
        expect(graph.hasNode("A")).toBeTruthy();
        expect(graph.hasNode("H")).toBeTruthy();
      });

      it("returns false for node keys that are absent", () => {
        expect(graph.hasNode("Z")).toBeFalsy();
        expect(graph.hasNode(undefKey)).toBeFalsy();
      });
    });

    describe("getNode()", () => {
      describe("when there is a node at the given key", () => {
        it("returns the value assigned to the given node key", () => {
          expect(graph.getNode("A")).toBe("a");
          expect(graph.getNode("H")).toBe("h");
        });

        it("ignores the passed notSetValue", () => {
          expect(graph.getNode("A", "not set")).toBe("a");
        });
      });

      describe("when there is no node at the given key", () => {
        it("returns the notSetValue passed", () => {
          expect(graph.getNode("Z", "not set")).toBe("not set");
          expect(graph.getNode(undefKey, "unset")).toBe("unset");
        });

        it("returns undefined if there is no notSetValue", () => {
          expect(graph.getNode("Z")).toBeUndefined();
          expect(graph.getNode(undefKey, "unset")).toBe("unset");
        });
      });
    });

    describe("setNode()", () => {
      it("returns a new Graph", () => {
        expect(graph.setNode("I", "i")).not.toBe(graph);
      });

      it("adds the passed node to the new Graph", () => {
        expect(graph.setNode("I", "i").hasNode("I")).toBeTruthy();
      });
    });

    describe("deleteNode()", () => {
      it("returns a new Graph", () => {
        expect(graph.deleteNode("A")).not.toBe(graph);
      });

      it("removes the node at the passed index from the new Graph", () => {
        expect(graph.deleteNode("A").hasNode("A")).toBeFalsy();
      });
    });

    describe("hasEdge()", () => {
      it("returns true for connections that exist", () => {
        expect(graph.hasEdge("A", "B")).toBeTruthy();
        expect(graph.hasEdge("F", "H")).toBeTruthy();
      });

      it("returns false for connections that do not exist", () => {
        expect(graph.hasEdge("A", "F")).toBeFalsy();
        expect(graph.hasEdge("A", undefKey)).toBeFalsy();
      });
    });

    describe("getEdge()", () => {
      describe("when there is an edge between the given keys", () => {
        it("returns the value assigned to the edge between the given keys", () => {
          expect(graph.getEdge("A", "B")).toBe("ab");
        });

        it("ignores the passed notSetValue", () => {
          expect(graph.getEdge("A", "B", "not set")).toBe("ab");
        });
      });

      describe("when there is no edge between the given keys", () => {
        it("returns the notSetValue passed", () => {
          expect(graph.getEdge("C", "E", "not set")).toBe("not set");
          expect(graph.getEdge(undefKey, undefKey, "unset")).toBe("unset");
        });

        it("returns undefined if there is no notSetValue", () => {
          expect(graph.getEdge("C", "E")).toBeUndefined();
          expect(graph.getEdge(undefKey, undefKey)).toBeUndefined();
        });
      });
    });

    describe("connect()", () => {
      it("returns a new Graph", () => {
        expect(graph.connect("A", "E", "ae")).not.toBe(graph);
      });

      it("adds the given edge to the new Graph", () => {
        expect(graph.connect("A", "E", "ae").getEdge("A", "E")).toBe("ae");
      });

      describe("when an invalid key is passed", () => {
        it("returns the same Graph", () => {
          expect(graph.connect("A", "Z", "az")).toBe(graph);
          expect(graph.connect(undefKey, undefKey, "invalid")).toBe(graph);
        });
      });
    });

    describe("disconnect()", () => {
      it("returns a new Graph", () => {
        expect(graph.disconnect("A", "B")).not.toBe(graph);
      });

      it("removes the given edge from the new Graph", () => {
        expect(graph.disconnect("A", "B").getEdge("A", "B")).toBeUndefined();
      });

      describe("when an invalid key is passed", () => {
        it("returns the same Graph", () => {
          expect(graph.disconnect("A", "Z")).toBe(graph);
          expect(graph.disconnect(undefKey, undefKey)).toBe(graph);
        });
      });
    });

    describe("findSources()", () => {
      const sources = NodeSeq(["a", "e"]);

      it("returns all nodes that aren't edge targets", () => {
        expect(graph.findSources().equals(sources)).toBeTruthy();
      });
    });

    describe("findSinks()", () => {
      const sinks = NodeSeq(["g", "h"]);

      it("returns all nodes that aren't edge sources", () => {
        expect(graph.findSinks().equals(sinks)).toBeTruthy();
      });
    });

    describe("topoSort()", () => {
      // Branching nodes excluded to avoid order ambiguity
      const sorted = Seq.Indexed(["A", "B", "D", "F", "G"]);

      it("returns nodes sorted topologically", () => {
        expect(
          graph
            .topoSort()!
            .filter(([k, _]) => sorted.contains(k))
            .map(([k, _]) => k)
            .equals(sorted),
        ).toBeTruthy();
      });

      it("returns the same number of nodes as in the graph", () => {
        expect(graph.topoSort().count()).toBe(graph.nodes.count());
      });

      describe("when a cycle exists", () => {
        it("returns fewer than all nodes", () => {
          expect(
            graph
              .connect("G", "A", "ga")
              .topoSort()
              .count(),
          ).toBeLessThan(graph.nodes.count());
        });
      });
    });

    describe("hasCycles()", () => {
      it("returns false if there is no cycle", () => {
        expect(graph.hasCycles()).toBeFalsy();
      });

      it("returns true if there is a cycle", () => {
        expect(graph.connect("F", "A", "fa").hasCycles()).toBeTruthy();
      });
    });
  });
});

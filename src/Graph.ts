import { hash, Record, Map, ValueObject, Seq } from "immutable";

type NodeKey = string;

class EdgeKey implements ValueObject {
  constructor(public source: NodeKey, public target: NodeKey) {}

  equals(other: EdgeKey): boolean {
    return this.source === other.source && this.target === other.target;
  }

  hashCode(): number {
    let result = 17;
    result = result * 37 + hash(this.source);
    result = result * 37 + hash(this.target);
    return result;
  }
}

interface GraphProps<N, E> {
  nodes: Map<NodeKey, N>;
  edges: Map<EdgeKey, E>;
}

interface GraphMethods<N, E> {
  predecessors(key: NodeKey): Seq<NodeKey, N>;
  successors(key: NodeKey): Seq<NodeKey, N>;
  neighbors(key: NodeKey): Seq<NodeKey, N>;

  hasNode(key: NodeKey): boolean;
  getNode<NSV>(key: NodeKey, notSetValue: NSV): N | NSV;
  getNode(key: NodeKey): N | undefined;
  setNode(key: NodeKey, node: N): this;
  deleteNode(key: NodeKey): this;

  hasEdge(srcKey: NodeKey, tgtKey: NodeKey): boolean;
  getEdge<NSV>(srcKey: NodeKey, tgtKey: NodeKey, notSetValue: NSV): E | NSV;
  getEdge(srcKey: NodeKey, tgtKey: NodeKey): E | undefined;
  connect(srcKey: NodeKey, tgtKey: NodeKey, edge: E): this;
  disconnect(srcKey: NodeKey, tgtKey: NodeKey): this;

  findSources(): Seq<NodeKey, N>;
  findSinks(): Seq<NodeKey, N>;
  topoSort(): Seq.Indexed<[NodeKey, N]> | undefined;
  hasCycles(): boolean;
}

class UntypedGraph<N, E> extends Record<GraphProps<any, any>>({
  nodes: Map(),
  edges: Map(),
}) implements GraphMethods<N, E> {
  predecessors(key: NodeKey): Seq<NodeKey, N> {
    return Seq(this.edges)
      .filter((_, k) => k.target === key)
      .mapEntries(([k, _]) => [k.source, this.nodes.get(k.source)]);
  }
  successors(key: NodeKey): Seq<NodeKey, N> {
    return Seq(this.edges)
      .filter((_, k) => k.source === key)
      .mapEntries(([k, _]) => [k.target, this.nodes.get(k.target)]);
  }
  neighbors(key: NodeKey): Seq<NodeKey, N> {
    const pre = this.predecessors(key);
    const suc = this.successors(key).filterNot((_, k) => pre.has(k));
    return pre.concat(suc) as Seq<NodeKey, N>;
  }

  hasNode(key: NodeKey): boolean {
    return this.nodes.has(key);
  }
  getNode<NSV>(key: NodeKey, notSetValue?: NSV): N | NSV | undefined {
    return this.nodes.get(key, notSetValue);
  }
  setNode(key: NodeKey, node: N): this {
    return this.setIn(["nodes", key], node);
  }
  deleteNode(key: NodeKey): this {
    return this.deleteIn(["nodes", key]);
  }

  hasEdge(srcKey: NodeKey, tgtKey: NodeKey): boolean {
    return this.edges.has(new EdgeKey(srcKey, tgtKey));
  }
  getEdge<NSV>(
    srcKey: NodeKey,
    tgtKey: NodeKey,
    notSetValue?: NSV,
  ): E | NSV | undefined {
    return this.edges.get(new EdgeKey(srcKey, tgtKey), notSetValue);
  }
  connect(srcKey: NodeKey, tgtKey: NodeKey, edge: E): this {
    if (!this.hasNode(srcKey) || !this.hasNode(tgtKey)) {
      return this;
    }
    return this.setIn(["edges", new EdgeKey(srcKey, tgtKey)], edge);
  }
  disconnect(srcKey: NodeKey, tgtKey: NodeKey): this {
    if (!this.hasNode(srcKey) || !this.hasNode(tgtKey)) {
      return this;
    }
    return this.deleteIn(["edges", new EdgeKey(srcKey, tgtKey)]);
  }

  findSources(): Seq<NodeKey, N> {
    const targets = this.edges.keySeq().map(({ target }) => target);
    return this.nodes.toSeq().filterNot((_, k) => targets.contains(k));
  }
  findSinks(): Seq<NodeKey, N> {
    const sources = this.edges.keySeq().map(({ source }) => source);
    return this.nodes.toSeq().filterNot((_, k) => sources.contains(k));
  }
  topoSort(): Seq.Indexed<[NodeKey, N]> {
    let wavefront = this.findSources()
      .keySeq()
      .toSet();
    let edges = this.edges;
    return Seq({
      [Symbol.iterator]: () => {
        return {
          next: () => {
            const nodeKey = wavefront.first();
            if (!nodeKey) {
              return { done: true, value: (undefined as any) as [NodeKey, N] };
            }
            wavefront = wavefront.skip(1);
            edges = edges.filter((_, { source }) => source !== nodeKey);
            this.successors(nodeKey)
              .filterNot((_, sucKey) =>
                edges.some((_, edgeKey) => edgeKey.target === sucKey),
              )
              .forEach((_, sucKey) => (wavefront = wavefront.add(sucKey)));

            return {
              done: false,
              value: [nodeKey, this.getNode(nodeKey)! as N],
            };
          },
        };
      },
    } as Iterable<[NodeKey, N]>);
  }
  hasCycles(): boolean {
    return this.topoSort().count() !== this.nodes.count();
  }
}

type Graph<N, E = N> = UntypedGraph<N, E> &
  Readonly<GraphProps<N, E>> &
  GraphMethods<N, E>;

function Graph<N, E = N>(values?: Partial<GraphProps<N, E>>): Graph<N, E> {
  return new UntypedGraph(values);
}

namespace Graph {
  export function from<N, E>(
    nodes: Iterable<[NodeKey, N]>,
    edges?: Iterable<[NodeKey, NodeKey, E]>,
  ): Graph<N, E> {
    return new UntypedGraph({
      nodes: Map(nodes),
      edges: edges
        ? Seq(edges)
            .toKeyedSeq()
            .mapEntries(([_, [source, target, node]]) => [
              new EdgeKey(source, target),
              node,
            ])
            .toMap()
        : Map(),
    });
  }
}

export { UntypedGraph, GraphProps, GraphMethods };
export { Graph, NodeKey, EdgeKey };

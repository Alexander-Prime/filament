import { hash, Record, Map, ValueObject, Seq } from "immutable";

type NodeKey = number | string | ValueObject;

class EdgeKey<K> implements ValueObject {
  constructor(public source: K, public target: K) {}

  equals(other: EdgeKey<K>): boolean {
    return this.source === other.source && this.target === other.target;
  }

  hashCode(): number {
    let result = 17;
    result = result * 37 + hash(this.source);
    result = result * 37 + hash(this.target);
    return result;
  }
}

interface GraphProps<K, N, E> {
  nodes: Map<K, N>;
  edges: Map<EdgeKey<K>, E>;
}

interface GraphMethods<K, N, E> {
  predecessors(key: K): Seq<K, N>;
  successors(key: K): Seq<K, N>;
  neighbors(key: K): Seq<K, N>;

  ancestors(key: K): Seq<K, N>;
  descendants(key: K): Seq<K, N>;

  hasNode(key: K): boolean;
  getNode<NSV>(key: K, notSetValue: NSV): N | NSV;
  getNode(key: K): N | undefined;
  setNode(key: K, node: N): this;
  deleteNode(key: K): this;

  hasEdge(srcKey: K, tgtKey: K): boolean;
  getEdge<NSV>(srcKey: K, tgtKey: K, notSetValue: NSV): E | NSV;
  getEdge(srcKey: K, tgtKey: K): E | undefined;
  connect(srcKey: K, tgtKey: K, edge: E): this;
  disconnect(srcKey: K, tgtKey: K): this;
  connectAll(
    srcKeys: Iterable<K>,
    tgtKeys: Iterable<K>,
    value: (src: K, tgt: K) => E,
  ): this;

  findSources(): Seq<K, N>;
  findSinks(): Seq<K, N>;
  topoSort(): Seq.Indexed<[K, N]> | undefined;
  hasCycles(): boolean;
}

class UntypedGraph<K, N, E>
  extends Record<GraphProps<any, any, any>>({
    nodes: Map(),
    edges: Map(),
  })
  implements GraphMethods<K, N, E> {
  predecessors(key: K): Seq<K, N> {
    return Seq(this.edges)
      .filter((_, k) => k.target === key)
      .mapEntries(([k, _]) => [k.source, this.nodes.get(k.source)]);
  }
  successors(key: K): Seq<K, N> {
    return Seq(this.edges)
      .filter((_, k) => k.source === key)
      .mapEntries(([k, _]) => [k.target, this.nodes.get(k.target)]);
  }
  neighbors(key: K): Seq<K, N> {
    const pre = this.predecessors(key);
    const suc = this.successors(key).filterNot((_, k) => pre.has(k));
    return pre.concat(suc) as Seq<K, N>;
  }

  ancestors(key: K): Seq<K, N> {
    return this.traverseUp([key]).filter((_, k) => k !== key);
  }
  descendants(key: K): Seq<K, N> {
    return this.traverseDown([key]).filter((_, k) => k !== key);
  }

  hasNode(key: K): boolean {
    return this.nodes.has(key);
  }
  getNode<NSV>(key: K, notSetValue?: NSV): N | NSV | undefined {
    return this.nodes.get(key, notSetValue);
  }
  setNode(key: K, node: N): this {
    return this.setIn(["nodes", key], node);
  }
  deleteNode(key: K): this {
    return this.deleteIn(["nodes", key]);
  }

  hasEdge(srcKey: K, tgtKey: K): boolean {
    return this.edges.has(new EdgeKey(srcKey, tgtKey));
  }
  getEdge<NSV>(srcKey: K, tgtKey: K, notSetValue?: NSV): E | NSV | undefined {
    return this.edges.get(new EdgeKey(srcKey, tgtKey), notSetValue);
  }
  connect(srcKey: K, tgtKey: K, edge: E): this {
    if (!this.hasNode(srcKey) || !this.hasNode(tgtKey)) {
      return this;
    }
    return this.setIn(["edges", new EdgeKey(srcKey, tgtKey)], edge);
  }
  disconnect(srcKey: K, tgtKey: K): this {
    if (!this.hasNode(srcKey) || !this.hasNode(tgtKey)) {
      return this;
    }
    return this.deleteIn(["edges", new EdgeKey(srcKey, tgtKey)]);
  }
  connectAll(
    srcKeys: Iterable<K>,
    tgtKeys: Iterable<K>,
    value: (src: K, tgt: K) => E,
  ) {
    const srcs = Seq(srcKeys).filter(src => this.nodes.has(src));
    const tgts = Seq(tgtKeys).filter(tgt => this.nodes.has(tgt));
    return this.update("edges", (edges: Map<EdgeKey<K>, E>) => {
      return srcs
        .flatMap(source =>
          tgts.map(
            target =>
              [new EdgeKey(source, target), value(source, target)] as [
                EdgeKey<K>,
                E
              ],
          ),
        )
        .reduce((prior, edge) => prior.set(edge[0], edge[1]), edges);
    });
  }

  findSources(): Seq<K, N> {
    const targets = this.edges.keySeq().map(({ target }) => target);
    return this.nodes.toSeq().filterNot((_, k) => targets.contains(k));
  }
  findSinks(): Seq<K, N> {
    const sources = this.edges.keySeq().map(({ source }) => source);
    return this.nodes.toSeq().filterNot((_, k) => sources.contains(k));
  }
  topoSort(): Seq.Indexed<[K, N]> {
    return this.traverseDown(this.findSources().keySeq()).entrySeq();
  }
  hasCycles(): boolean {
    return this.topoSort().count() !== this.nodes.count();
  }

  private traverseUp(keys: Iterable<K>): Seq<K, N> {
    let wavefront = Seq(keys).toSet();
    let edges = this.edges;
    return Seq.Keyed({
      [Symbol.iterator]: () => {
        return {
          next: () => {
            const nodeKey = wavefront.first();
            if (!nodeKey) {
              return { done: true, value: (undefined as any) as [K, N] };
            }
            wavefront = wavefront.skip(1);
            edges = edges.filter((_, { target }) => target !== nodeKey);
            this.predecessors(nodeKey)
              .filterNot((_, sucKey) =>
                edges.some((_, edgeKey) => edgeKey.source === sucKey),
              )
              .forEach((_, sucKey) => (wavefront = wavefront.add(sucKey)));

            return {
              done: false,
              value: [nodeKey, this.getNode(nodeKey)! as N],
            };
          },
        };
      },
    } as Iterable<[K, N]>);
  }
  private traverseDown(keys: Iterable<K>): Seq<K, N> {
    let wavefront = Seq(keys).toSet();
    let edges = this.edges;
    return Seq.Keyed({
      [Symbol.iterator]: () => {
        return {
          next: () => {
            const nodeKey = wavefront.first();
            if (!nodeKey) {
              return { done: true, value: (undefined as any) as [K, N] };
            }
            wavefront = wavefront.skip(1);
            edges = edges.filter(
              (_: any, { source }: { source: K }) => source !== nodeKey,
            );
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
    } as Iterable<[K, N]>);
  }
}

type Graph<K extends NodeKey, N = void, E = void> = UntypedGraph<K, N, E> &
  Readonly<GraphProps<K, N, E>> &
  GraphMethods<K, N, E>;

function Graph<K extends NodeKey, N, E>(
  values?: Partial<GraphProps<K, N, E>>,
): Graph<K, N, E> {
  return new UntypedGraph(values);
}

namespace Graph {
  export function from<K extends NodeKey, N, E>(
    nodes: Iterable<[K, N]>,
    edges?: Iterable<[K, K, E]>,
  ): Graph<K, N, E> {
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

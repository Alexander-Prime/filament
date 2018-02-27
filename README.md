A small library implementing a directed graph structure as an Immutable.js `Record`. It includes a `topoSort()` method, which returns a lazy `Seq` of the graphs nodes, sorted topologically.

## Installation

```sh
npm install "Alexander-Prime/filament#semver:0.1"
```

## Usage

```typescript
import { Graph, NodeKey } from "filament";

const nodes: [NodeKey, string][] = [
  ["A", "You can keep any data"],
  ["B", "in a node or edge."],
  ["C", "They are stored internally in Immutable.js Maps."],
];

const edges: [NodeKey, NodeKey, string][] = [
  ["A", "B", "Edges are directed."],
  ["A", "C", "A graph containing a cycle"],
  ["B", "C", "will fail to include all nodes in topoSort()"],
];

const graph = Graph.from(nodes, edges);

graph.topoSort().forEach(([k, v]) => console.log(v));
```

Running this will output:

```
You can keep any data
in a node or edge.
They are stored internally in Immutable.js Maps.
```

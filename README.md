# @loken/hierarchies ![Published on npm](https://img.shields.io/npm/v/@loken/hierarchies.svg?logo=npm)

TypeScript library for working with hierarchies of identifiers and identifiable items.

Traverse, search, and reason about hierarchical data with deterministic order, identity-aware traversal, and fast enumeration.


## Quick start

Install the package into your TypeScript project:

```shell
pnpm add @loken/hierarchies @loken/utilities
```

Create a hierarchy from items with a parent ID or externalized relations, traverse and search:

```typescript
const hierarchy1 = Hierarchies.fromParentIds(items, i => i.id, i => i.parentId ?? undefined);
const hierarchy2 = Hierarchies.fromRelationsWithItems(items, i => i.id, [
    [ 'r', 'a' ],
    [ 'r', 'b' ],
]);

// Retrieve and project descendants or ancestors.
const getNodes = hierarchy1.getDescendants('a', true);
const getItems = hierarchy1.getDescendantItems('a', true);
const getIds   = hierarchy1.getDescendantIds('a', true);

// Find matches by predicate
const foundNodes = hierarchy1.find(n => n.item.name === 'a');
const foundItems = hierarchy1.findItems(n => n.item.name === 'a');
const foundIds   = hierarchy1.findIds(n => n.item.name === 'a');

// Search to create a pruned clone of the hierarchy.
const prunedHierarchy = hierarchy1.search([ 'a' ], { matches: true, ancestors: false, descendants: true });

// Clone the entire hierarchy.
const clonedHierarchy = hierarchy1.clone();
```

*Next*: Jump to [Building hierarchies](#building-hierarchies).


## Features

- Build hierarchies from items, relations, or child maps with simple factory methods
- Deterministic sibling order and stable traversal (preserves source order)
- Fast breadth- or depth first traversal with optional cycle detection
- Advanced traversal with a `signal` delegate (prune/skip/stop)
- Powerful search: find by predicate or produce pruned hierarchies (matches/ancestors/descendants)
- Convenient mapping: convert between relations, child maps, nodes and text
- Serialization helpers for fixtures, tests and persistence
- Node branding to prevent cross-hierarchy contamination
- Optimized for speed and low memory overhead
- .NET sibling with near-identical APIs: https://www.nuget.org/packages/Loken.Hierarchies


## Concepts

### Preamble: Prepare items and relations

A hierarchy can hold IDs or Items represented by IDs.

Let's prepare some items and relations to use for our examples.

When the Item contains a parent ID, we can derive relations from the items.

```typescript
import { Hierarchies, Nodes, type Relation } from '@loken/hierarchies';
import { MultiMap } from '@loken/utilities';

interface Item { parentId?: string | null; id: string; name: string }

const root: Item = { parentId: null, id: 'r', name: 'root' };
const a:    Item = { parentId: 'r', id: 'a', name: 'branch-A' };
const b:    Item = { parentId: 'r', id: 'b', name: 'branch-B' };
const a1:   Item = { parentId: 'a', id: 'a1', name: 'leaf-A1' };
const a2:   Item = { parentId: 'a', id: 'a2', name: 'leaf-A2' };
const items = [ root, a, b, a1, a2 ];
```

When it does not, we must provide the structure through other means such as relations or a child map. Let's prepare both.

```typescript
const relations: Relation<string>[] = [
    [ 'r' ],
    [ 'r', 'a' ],
    [ 'r', 'b' ],
    [ 'a', 'a1' ],
    [ 'a', 'a2' ],
];

const childMap = MultiMap.parse<string>(`
    r:a,b
    a:a1,a2
    `);
```

### Item vs ID hierarchies

- Use a hierarchy of items when the dataset is small enough to keep in memory and you want to traverse and query rich objects directly.
- Use a hierarchy of IDs when items are too large, numerous or remote; traverse IDs first, then fetch the matching entities from your data source.

### Identification delegates

Why delegates to identify items? We don't force an interface or base class. Passing `identify(item)` (and `identifyParent(item)`) lets you pick any key shape, including composites, hashes, or adapters over legacy models, without changing your types.

### Relations

We support several representations and conversions:

Use `Relation<TId>` for portable storage and diffs, `MultiMap<TId>` for fast in-memory graph construction

1. `Relation<TId>` holds a parent-to-child relation.
2. `MultiMap<TId>` is used for representing a child map for ID relations. You can build it directly, or use helpers like `MultiMap.Parse<TId>(text)` and `map.Render()` to serialize as text.
> **NB!** There is no `HierarchyRelation<TId>` like we have for .NET as a database storage format.

Use extension methods to map or convert between structure representations for IDs: nodes, relations, child maps, and text.

```csharp
// Mapping between structure representations
const relationsFromHierarchy = hierarchy1.toRelations();
const childMapFromHierarchy  = hierarchy1.toChildMap();
const nodesFromRelations     = Nodes.fromRelations(relationsFromHierarchy);
const nodesFromChildMap      = Nodes.fromChildMap(childMapFromHierarchy);
// Serialize between child map and text
const textChildMap           = childMapFromHierarchy.render();
const parsedChildMap         = MultiMap.parse(textChildMap);
const parsedIntChildMap      = MultiMap.parse('0:1,2', { transform: parseInt });
```

### Discoverability and API surface

Functionality is provided on the "static" `Nodes` and `Hierarchies` classes serving as both factory classes and discovery containers for querying, traversal and mapping/conversion through methods like `get*`, `find*`, `to*` and `from*`.

*Next*: See [Building hierarchies](#building-hierarchies) to construct graphs, or jump to [Query and traversal](#query-and-traversal) to work with existing ones.


## Building hierarchies

There are many ways of creating a hierarchy. We can build it imperatively, use known relations encoded into the items as a parent-child relationship or use an external list of relations or a child-map.

### Build imperatively

Create an empty hierarchy, then create nodes and attach them to each other or to the hierarchy directly.

```typescript
const hierarchy = Hierarchies.createForItems<Item, string>(i => i.id);

// Create nodes and attach them to each other
const branchNodes = Nodes.create(a, b);
const rootNode    = Nodes.create(root).attach(branchNodes);

// Attach the root node as a hierarchy root. (Yes we can have multiple roots.)
hierarchy.attachRoot(rootNode);

// Create some leaf nodes and attach them to the "a" branch of the hierarchy directly.
const leafNodes = Nodes.create(a1, a2);
hierarchy.attach('a', leafNodes);
```

### Create from items with parents

We can provide the structure implicitly by providing a mapping delegate. The delegate may provide the parent ID from a property, as shown below, or though any other means such as another data structure.

```typescript
const parentedHc = Hierarchies.fromParentIds(items, i => i.id, i => i.parentId);
```

Related variants exist when your models expose other shapes:
- Children by ID list: `Hierarchies.fromChildIds(items, identify, identifyChildren)`.
- Root items with children references: `Hierarchies.fromChildItems(roots, identify, children)`.
- Leaf items with parent reference: `Hierarchies.fromParentItems(leaves, identify, parent)`.

### Create from relations or child map

You can create a hierarchy of IDs or items from other relational structures such as relations or a child map.

```typescript
const idHierarchyFromRelations   = Hierarchies.fromRelations(relations);
const itemHierarchyFromRelations = Hierarchies.fromRelationsWithItems(items, i => i.id, relations);

const idHierarchyFromMap         = Hierarchies.fromChildMap(childMap);
const itemHierarchyFromMap       = Hierarchies.fromChildMapWithItems(items, i => i.id, childMap);
```

For item hierarchies with a child map, use `Hierarchies.fromChildMapWithItems(items, identify, childMap)`.

### Create from hierarchy

Create a hierarchy that matches the structure of another hierarchy but with different content.

Common scenarios:
1. **Memory optimization** - Convert an item-hierarchy to an ID-hierarchy when you only need structural reasoning
2. **Data hydration** - Build an item-hierarchy from database items matching an existing ID-hierarchy
3. **Multiple representations** - Create hierarchies for different data views of the same conceptual structure

```typescript
// Create ID-hierarchy matching an item-hierarchy's structure
const matchingIdHc = Hierarchies.fromHierarchy(parentedHc);

// Create item-hierarchy matching an ID-hierarchy's structure
const matchingItemHc = Hierarchies.fromHierarchyWithItems(items, i => i.id, matchingIdHc);
```


## Query and traversal

Query and traverse hierarchies using the high-level `Hierarchy<Item, Id>` API.

- `get*` methods will throw if you pass an ID which does not exist in the hierarchy. If you don't know, use `find*` instead!
- For methods traversing ancestors or descendants, you can provide an optional `includeSelf` flag to specify whether the provided IDs should be included in the retrieval or search.
- For methods traversing descendants you may also specify `depth-first` if you don't want the default `breadth-first` traversal type.

### Get by ID

Check existence and retrieve specific nodes or items by their IDs.

```typescript
// Check existence
hierarchy.has('a');
hierarchy.hasSome([ 'a', 'b' ]);
hierarchy.hasEvery([ 'a', 'b' ]);

// Get a single item
hierarchy.get('a');
hierarchy.getItems('a');

// Get multiple items
hierarchy.getSome([ 'a', 'b' ]);
hierarchy.getSomeItems([ 'a', 'b' ]);
```

### Find by predicate

Lookup all nodes, items or IDs matching a predicate.

```typescript
hierarchy.find(n => n.item.name === 'a');
hierarchy.findItems(n => n.item.name === 'a');
hierarchy.findIds(n => n.item.name === 'a');
```

### Get descendants and ancestors

Retrieve all descendants or ancestors of one or more IDs.

```typescript
// Get descendants/ancestors by ID
hierarchy.getDescendants('a');
hierarchy.getDescendantItems('a');
hierarchy.getDescendantIds('a');
// Get descendants/ancestors by IDs
hierarchy.getDescendants([ 'a', 'b' ]);
hierarchy.getDescendantItems([ 'a', 'b' ]);
hierarchy.getDescendantIds([ 'a', 'b' ]);
```
> **NB!** Similar methods exist for ancestors: GetAncestors, GetAncestorItems, GetAncestorIds

### Find descendants and ancestors

Search within descendants or ancestors of nodes matching the ID(s) of the first parameter, looking for nodes matching the ID(s) or predicate of the second parameter.

```typescript
// Find the first matching descendant of a single starting node.
hierarchy.findDescendant('a', 'a2');
hierarchy.findDescendant('a', [ 'a1', 'a2' ]);
hierarchy.findDescendant('a', n => n.item.id.endsWith('2'));

// Find the first matching descendant of multiple starting nodes.
hierarchy.findDescendant([ 'a', 'b' ], 'a2');
hierarchy.findDescendant([ 'a', 'b' ], [ 'a1', 'a2' ]);
hierarchy.findDescendant([ 'a', 'b' ], n => n.item.id.endsWith('2'));

// Find all matching descendants of a single starting node.
hierarchy.findDescendants('a', [ 'a1', 'a2' ]);
hierarchy.findDescendants('a', n => n.item.id.endsWith('2'));
hierarchy.findDescendantIds('a', [ 'a1', 'a2' ]);
hierarchy.findDescendantIds('a', n => n.item.id.endsWith('2'));
hierarchy.findDescendantItems('a', [ 'a1', 'a2' ]);
hierarchy.findDescendantItems('a', n => n.item.id.endsWith('2'));

// Find all matching descendants of multiple starting nodes.
hierarchy.findDescendants([ 'a', 'b' ], [ 'a1', 'a2' ]);
hierarchy.findDescendants([ 'a', 'b' ], n => n.item.id.endsWith('2'));
hierarchy.findDescendantIds([ 'a', 'b' ], [ 'a1', 'a2' ]);
hierarchy.findDescendantIds([ 'a', 'b' ], n => n.item.id.endsWith('2'));
hierarchy.findDescendantItems([ 'a', 'b' ], [ 'a1', 'a2' ]);
hierarchy.findDescendantItems([ 'a', 'b' ], n => n.item.id.endsWith('2'));
```
> **NB!** Similar methods exist for ancestors: findAncestor, findAncestors, findAncestorItems, findAncestorIds

### Search for sub-hierarchy

Create a new hierarchy with nodes for a subset of matching nodes.

The included nodes are controlled by the flags of the `include` parameter:
- `matches`: Include the match itself.
- `ancestors`: Include all ancestors of a match.
- `descendants`: Include all descendants of a match.

The result is effectively a pruned clone of the original hierarchy.

```typescript
// Create a hierarchy consisting of the root, "a", "a1" and "a2", effectively excluding branch "b".
hierarchy.search('a', { matches: true, ancestors: true, descendants: true });
// Create a hierarchy consisting of the node "a" and its ancestors "r".
hierarchy.search('a', { matches: true, ancestors: true });
// Create a hierarchy consisting of the branch "a" as its root.
hierarchy.search('a', { matches: true, descendants: true });
// Create a hierarchy consisting of the branches "a" and "b" as its roots.
hierarchy.search([ 'a', 'b' ], { matches: true, descendants: true });
// Create a hierarchy consisting of nodes with a single letter ID; "r", "a", "b".
hierarchy.search(n => n.item.id.length === 1, { matches: true, descendants: false });
```

### Node APIs

When you need fine-grained control or are working directly with nodes, use these lower-level APIs.

#### Node retrieval

```typescript
branchNodes[0].getDescendants(true, 'depth-first');
branchNodes[0].getAncestors(true);
```

#### Graph traversal

For advanced scenarios where you need custom traversal logic with pruning or early termination.

```typescript
// Simple traversal
traverseGraph({
    roots: rootNode,
    next:  node => node.children,
});

// Advanced traversal with signal controller (next/skip/stop)
traverseGraph({
    roots:  rootNode,
    signal: (node, signal) => {
        // Don't traverse into the children of "a1"
        if (node.item.id !== 'a1')
            signal.next(node.children);
        // Don't yield for "a"
        if (node.parent?.item.id === 'a')
            signal.skip();
        // If you reach "x", stop the traversal
        if (node.item.id === 'x')
            signal.stop();
    },
});
// Also provides options for detectCycles and traversal type.
```
> **Tip**: Defaults are "yield this node" and "don't traverse children." Use `next()` to traverse and `skip()` to exclude. `yield()` and `prune()` are optional no-ops to be explicit and aid with code flow.

#### Sequence traversal

For traversing non-hierarchy sequences with similar control patterns.

```typescript
interface El { value: number; next?: El }
const el4: El = { value: 4 };
const el3: El = { value: 3, next: el4 };
const el2: El = { value: 2, next: el3 };
const el1: El = { value: 1, next: el2 };

const elements = traverseSequence({
    first:  el1,
    signal: (el, signal) => {
        // Skip odd numbers
        if (el.value % 2 === 1)
            signal.skip();
        // Provide next when continuing
        if (el.next)
            signal.next(el.next);
    },
});
```
> **Tip**: `yield()` and `prune()` exists here like for `traverseGraph()`.


## Performance

- For `traverse*`, prefer the simple `next` delegate and use `signal` only when you need pruning or early stop.
- Enable cycle detection only when you expect cycles; it adds hashing per node.
- Nodes are double-linked for fast up/down traversal. This trades a small memory overhead for speed; be mindful with very large graphs.
- Eager vs. lazy choices:
   - Results are often eager arrays to avoid iterator overhead.
   - Passing one method's result into another typically avoids extra allocations.
   - Some properties like `HCNode.children` are lazy and cached to keep edits and repeated access cheap.


## Semantics

### Ordering and identity

- Sibling order is deterministic. Children are kept in insertion order, and traversals enumerate children in that order. When constructing from relations or a child map, the source order is preserved.
- Cycle detection and visited semantics are identity-based. When cycle detection is enabled, traversal tracks visited nodes by reference. Separate `HCNode<Item>` instances that wrap the same `item` are considered distinct for visitation.
- Equality: In JavaScript/TypeScript, objects are compared by reference. Compare values like `node.item.id` when you need value equality.

### Serialization

Nodes are runtime wrappers and not designed for direct JSON serialization. Persist your relations (`Relation<Id>`/`MultiMap<Id>`) or items and rebuild the hierarchy when needed.


## Persistence

Persist structure, not nodes. Store relations or a child map next to your items and rebuild hierarchies when needed.

- Recommended representations:
    - Relations: `Relation<Id>[]` (portable, append-friendly; produce with `hierarchy.toRelations()`).
    - Child map: `MultiMap<Id>` (compact text for fixtures/tests or text file storage via `map.render()`, parse with `MultiMap.parse(text)`).
- Rebuild as needed:
    - ID hierarchy from a child map: `Hierarchies.fromChildMap(map)`.
    - Item hierarchy from relations: `Hierarchies.fromRelationsWithItems(items, identify, relations)`.
- Note: This TS package does not include database tagging types (like `.NET`'s `HierarchyRelation<TId>`) or diff helpers. Do diffs and persistence wiring in your app layer using the structures above.


## Branding

Nodes can be branded with ownership tokens to prevent cross-hierarchy contamination. Hierarchies automatically brand and debrand their nodes when you attach or detach a node, respectively. Since the hierarchy brand is internal, you cannot attach a node to more than one hierarchy at a time.

Branding is not serialized, but a new brand is created when you create a new hierarchy.

Manual branding is only needed if you're working with `HCNode`s that are not part of a `Hierarchy`. In short, it's a low-level node feature you usually don't need to know about.

> **NB!** Just don't try to add a node from one hierarchy to another without first detaching it!


## Docs and snippets

README code snippets are compile-verified in `src/hierarchies/readme-snippets.test.ts`.
Section headings mirror region names in that test to keep docs and examples in sync.


## .NET sibling library

Prefer .NET? The sibling package `Loken.Hierarchies` exposes the same core constructs and near-identical APIs:

- Shared concepts: `Hierarchies`, `Nodes`, `Relations`, `MultiMap`
- Parity: Similar method names and shapes across languages
- Differences: TypeScript prefers static factory methods; .NET emphasizes extension methods for discoverability

Get it on NuGet: https://www.nuget.org/packages/Loken.Hierarchies


## Feedback & Contribution

If you like what you see or want to suggest changes, please open an issue or PR.
Run tests with `pnpm install` and `pnpm test`.

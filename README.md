# @loken/hierarchies

[![Published on npm](https://img.shields.io/npm/v/@loken/hierarchies.svg?logo=npm)](https://www.npmjs.com/package/@loken/hierarchies)

Library for working with hierarchies of identifiers and identifiable objects.

The idea is that quite often you have a list of items, usually from a database that form a tree hierarchy and you want to traverse it, search it and reason about the parents, children, ancestors and descendants. `@loken/hierarchies` is built to solve that.


## Prerequisites

A common set of tools we use rely on the concept of a set of `Relation<T>`s and a child-map implemented as a `MultiMap<T>` (from `@loken/utilities`). We use these data structures to represent parent-to-child relationships and a map of item IDs to child IDs, respectively.

A `Relation<number>` is simply a tuple and can be made like this:

```typescript
const relations: Relation<number> = [
	[1, 11, 12],
	[2, 21],
	[21, 211]
];
```

A `MultiMap<number>` representing the same relations can be created like this:

```typescript
const childMap = new MultiMap<number>();
childMap.add(1, [ 11, 12 ]);
childMap.add(2, [ 21 ]);
childMap.add(21, [ 211 ]);
```

Alternatively, you can make a `MultiMap<number>` by using it's static `parse` function like this:

```typescript
const childMap = MultiMap.parse<number>(`
1:11,12
2:21
21:211
`, {transform: parseInt})
```

You can also serialize the `MultiMap` back to a string using its static `render` function. Both of these support various options to use as much or little padding and whatever separators you prefer.

When we use a `relations` or `childMap` symbol in the following examples, you can assume it's one of these.


## Hierarchy of Items

Sometimes the items are small, your list short and you can hold all of the items in memory at the same time. In such cases you can create a `Hierarchy<Item, Id>`, a hierarchy of items, by passing the items along with an `identify(item)`delegate and a specification of the parent-child relations.

### By `IdSpec<Id>`

The specification can be a list of `Relation<Id>`s, a `MultiMap<Id>` representing a map of item to child items or another `Hierarchy` with the same type of IDs.

```typescript
// With relations:
const hierarchy = Hierarchies.createWithItems({
	items,
	identify: item => item.id,
	spec:     relations,
});
// With other hierarchy:
var hierarchy = Hierarchies.createWithItems({
		items,
		identify: item => item.id,
		spec:     otherHierarchy,
	});
// With child map:
var hierarchy = Hierarchies.createWithItems({
	items,
	identify: item => item.id,
	spec:     childMap,
});
```

### By contained parent information

If your `Item`s contains information about its parent, either as a reference or as a foreign key, you can create the `Hierarchy<Item, Id>` by specifying this information:

```typescript
// With a delegate retrieving a foreign key to the parent:
var hierarchy = Hierarchies.createWithItems({
	items,
	identify: item => item.id,
	parentId: item => item.parentId,
});
// With a delegate retrieving a the parent directly:
var hierarchy = Hierarchies.createWithItems({
	items,
	identify: item => item.id,
	parent: item => item.parent,
});
```

### By contained child information

Similarly, if you your `Item` contains information about its children, either as references or as a list of foreign keys, you can create the `Hierarchy<Item, Id>` by specifying this information:

**NB!** If you provide the `children` delegate, the items should be only the roots and not all items.

```typescript
// With a delegate retrieving foreign keys to the child IDs:
var hierarchy = Hierarchies.createWithItems({
	items,
	identify: item => item.id,
	childIds: item => item.childIds,
});
// With a delegate retrieving a the child items directly:
var hierarchy = Hierarchies.createWithItems({
	items,
	identify: item => item.id,
	children: item => item.children,
});
```


## Hierarchy of IDs

Other times holding all items in memory is not feasible, but you still need to reason around the hierarchical relations so that you can retrieve a parent, ancestors, children or descendants of an entity.

In such cases you can build a `Hierarchy<Id>`, a hierarchy of IDs, based on known relations and then traverse that hierarchy of IDs to find the IDs of a parent, ancestors, children or descendants of an ID. Those IDs can then be used to retrieve the items from an API or a database.

> "How do you know know what the relationships are?"

If you can't or don't want to store your relations separate from your entities, chances are your entities have a foreign key to the ID of its parent. In such cases, you query the entities for a projection of `Relation<Id>` instances, which contains only the ID of a parent and child and create the hierarchy of IDs from that.

If you have a one-to-many parent-to-children relationship table to work with you can retrieve its records and easily map the `Relation<Id>`s and then create the hierarchy of IDs from that.

We can make a hierarchy of IDs similarly to how we make a hierarchy of items. The main difference is that for a hierarchy of IDs we only need to pass the specification since the item is the ID and hence the `identify` delegate is the identity function.

```typescript
// With relations:
var hierarchy = Hierarchies.createWithIds(relations);
// With other hierarchy:
var hierarchy = Hierarchies.createWithIds(otherHierarchy);
// With child map:
var hierarchy = Hierarchies.createWithIds(childMap);
```


## Identity delegates?

> "Why the delegates to identify items?"

We didn't want to enforce applying a particular interface or use reflection to access the primary key of an item. By instead using delegates you can use whatever you like to identify an item.

This opens up scenarios such as not having a database at all, and using the hash code or an index in a global list or some other madness. You can have a primary key that consists of multiple fields, by using a delegate you can combine those two fields into a tuple and use that as an identifier.


## Concepts

Let's describe the conceptually different things included in the package.

### Data structures

1. **Hierarchy**: Above we've discussed how to create the main data structures: `Hierarchy<Item, Id>` and `Hierarchy<Id>`, hierarchy of items and hierarchy of IDs, respectively.

	A hierarchy contains a tree of `HCNode<Item>`'s. It holds a dictionary of the nodes and roots so that it provides O(1) time complexity for looking them up by ID.

1. **Node**: A `HCNode<Item>` is double-linked wrapper for an `Item`. The double-link allow us to easily and efficiently traverse both up through the ancestry and down through descendants following links.

	You can create or assemble nodes or extract the relations of linked nodes using the static members of the `Nodes` class.

	_Note_: It is using a HC prefix to avoid a naming collision with NodeJS and keep it short.


#### Memory
Of course, double-linking comes at the cost of memory. We assume that you don't have a huge amount of nodes, and as such we've not optimized for minimal memory consumption. So if you do have a *lot* of nodes, you should check that we don't consume more memory than you can afford. (We've tried to be efficient in not realizing `IterableIterator<T>`s to collections as much as possible, though, so don't think we didn't consider memory at all!)

#### Branding
A node can be "branded" so that it cannot be attached to another node with a different brand. A node held by a hierarchy is automatically branded. This means that unless you want to intentionally break things by using reflection to break the branding protection, each node in a hierarchy can only belong to that hierarchy. Because of this we expose the nodes in the hierarchy.

If you want to use this API yourself, know that when you brand a node, you get a `DeBrand` delegate back. Calling this is the only way to debrand the node, so make sure you keep track of it!

### Relations

We support a few representations for relations and provide utilities for converting between them.

1. `Relation<Id>` holds a parent-to-child relation as a `readonly [parentId, childId]` tuple.
2. `MultiMap<Id>` can be used as another representation of `Relation<Id>`s by holding a parent-to-child map. The structure is from `@loken/utilities` and there are some convenient helpers in there for parsing a string into a MultiMap or rendering a MultiMap into a string. This means you could store your relations in a file using these extensions. We don't necessarily suggest that you do this, but it's an option for some quick prototyping etc.

### Traversal

An essential part of any tree/hierarchy/graph library is traversal. The `traverseGraph` and `traverseSequence` utility functions provide a way to traverse a graph (tree) or sequence (list) starting with one or more nodes, called `Multiple<Node<Item>>`.

They both provide options for simple and more complex, yet more flexible, traversal.

They both return an `IterableIterator<T>` rather than an array for memory optimization purposes when you want to loop over their result. If you need an array of the results, you'll have to spread the iterator into an array; `[...iterator]` or `spreadMultiple(iterator)`.

#### Traverse next
For simple node enumeration you simply pass the starting point as `roots` and a `next` delegate describing where to find the next node(s).

Here is an example of what simple traversal might look like for both Graph and Sequence:

```typescript
// Traverse a graph of objects which has a children property with an array of other nodes.
var nodeIterator = traverseGraph({
		roots: oneOrMoreNodes,
		next:  n => n.children,
	});
```
```typescript
// Create an iterable iterator of numbers (linked list) using a utility from @loken/utilities.
const sequence = traverseRange(0, 5);

const numberIterator = traverseSequence({
	first: sequence.next().value,
	next:  () => {
		const next = sequence.next();

		return next.done ? undefined : next.value;
	},
});
```

#### Traverse with signal
If you want to stop traversal at some condition like a certain depth or the contents of a node or skip some nodes from the output you can provide a `signal` delegate instead of the `next` delegate. You call members on the `signal` provided to that delegate to signal what to do. In the case of the graph traversal the `signal` exposes the current `depth` as a property.

Here is an example of what complex traversal using signal might look like for both Graph and Sequence:

```typescript
// Traverse a graph of objects which has a children property with an array of other nodes.
const nodeIterator = traverseGraph({
	roots:  oneOrMoreNodes,
	signal: (node, signal) => {
		// Exclude children of 21 which is 211.
		if (node.item !== 21)
			signal.next(node.children);

		// Skip children of 1 which is 11 and 12.
		if (node.parent?.item === 1)
			signal.skip();
	},
});
```
```typescript
// Create an iterable iterator of numbers (linked list) using a utility from @loken/utilities.
const sequence = traverseRange(1, 4);

const numberIterator = traverseSequence({
	first:  sequence.next(),
	signal: (element, signal) => {
		// Skip odd numbers.
		if (element.value! % 2 == 1)
			signal.skip();

		// By not providing the next value at el 3
		// we don't iterate into el 4 which would otherwise not be skipped.
		if (element.value === 3)
			return;

		// Signal the next element unless we're done.
		const next = sequence.next();
		if (!next.done)
			signal.next(next);
	},
});
```

#### Options
By default traversal type is `'breadth-first'`. But you can specify `'depth-first'` though the optional `type` option.

It is assumed that the graph is a tree, but if there can be cycles in your nodes, you can enable cycle detection through the optional `detectCycles` option (`false` by default).

#### Traverse a `Hierarchy` or `HCNode`
We provide some methods for traversal of a `Hierarchy` or a `Node` as a slightly higher abstraction than the `traverseGraph` and `traverseSequence` utilities.

These don't give you the option of breaking cycles, but they do give you the option of deciding whether to includeSelf, meaning include the node, id or ids you're starting at.

These are the relevant signatures:

```typescript
node.getDescendants(includeSelf = false, type: TraversalType = 'breadth-first'): HCNode<Item>[];
node.traverseDescendants(includeSelf = false, type: TraversalType = 'breadth-first'): Generator<HCNode<Item>>[];

node.getAncestors(includeSelf = false): HCNode<Item>[];
node.traverseAncestors(includeSelf = false): Generator<HCNode<Item>>[];
```

### Mapping

There are quite a few utilities and class member functions for mapping between relations, mapping from items to nodes, mapping items to IDs etc. Please explore the tests!


## .NET implementation

If you are a .NET enjoyer, like me, there is a nuget package for a similar feature set for .NET: [`Loken.Hierarchies`](https://github.com/loken/net-hierarchies)


## Feedback & Contribution

If you like what you see so far or would like to suggest changes to improve or extend what the library does, please don't hesitate to leave a comment in an issue or even a PR.

You can run the tests by cloning the repo, restoring packages using `pnpm` and running the `vitest` tests.

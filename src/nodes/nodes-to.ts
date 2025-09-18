import { MultiMap, Queue, someToArray, someToIterable, type Some } from '@loken/utilities';
import type { Relation } from '../relations/relation.types.ts';
import { flattenGraphNext } from '../traversal/graph-flatten.ts';
import type { Identify } from '../utilities/identify.ts';
import { nodeToIdProjection } from './node-conversion.ts';
import type { HCNode } from './node.ts';
import { traversalOptions } from '../traversal/graph.types.ts';


/** @internalexport */
export const nodesToChildMap = <Item, Id = Item>(
	roots: Some<HCNode<Item>>,
	identify?: Identify<Item, Id>,
	childMap = new MultiMap<Id>(),
): MultiMap<Id> => {
	const toId = nodeToIdProjection(identify);

	for (const root of someToIterable(roots)) {
		const nodeId = toId(root);
		if (root.isInternal) {
			const childIds = root.children.map(toId);
			childMap.add(nodeId, childIds);
		}
		else {
			childMap.addEmpty(nodeId);
		}
	}

	const nodes = flattenGraphNext({
		roots,
		next: node => node.children.filter(n => n.isInternal),
		...traversalOptions(),
	});

	for (const node of nodes) {
		const childNodes = node.children;
		const nodeId = toId(node);
		const childIds = childNodes.map(toId);
		childMap.add(nodeId, childIds);
	}

	return childMap;
};

/** @internalexport */
export const nodesToDescendantMap = <Item, Id = Item>(
	roots: Some<HCNode<Item>>,
	identify?: Identify<Item, Id>,
	descendantMap = new MultiMap<Id>(),
): MultiMap<Id> => {
	roots = someToArray(roots);

	type Stored = [ node: HCNode<Item>, ancestors: Set<Id>[] ];
	const toId = nodeToIdProjection(identify);
	const store = new Queue<Stored>();
	store.enqueue(roots.map(node => [ node, [] ] as Stored));

	for (const root of roots)
		descendantMap.addEmpty(toId(root));

	while (store.count > 0) {
		const [ node, ancestors ] = store.dequeue()!;
		const nodeId = toId(node);

		for (const ancestor of ancestors)
			ancestor.add(nodeId);

		const children = node.children;
		if (children?.length) {
			const nodeDescendants = descendantMap.addEmpty(nodeId);
			const childAncestors = [ ...ancestors, nodeDescendants ];
			store.enqueue(children.map(node => [ node, childAncestors ] as Stored));
		}
	}

	return descendantMap;
};

/** @internalexport */
export const nodesToAncestorMap = <Item, Id = Item>(
	roots: Some<HCNode<Item>>,
	identify?: Identify<Item, Id>,
	ancestorMap = new MultiMap<Id>(),
): MultiMap<Id> => {
	roots = someToArray(roots);

	type Stored = [ node: HCNode<Item>, ancestors?: Id[] ];
	const toId = nodeToIdProjection(identify);
	const store = new Queue<Stored>();
	store.enqueue(roots.map(node => [ node ] as Stored));

	for (const root of roots) {
		if (root.isLeaf)
			ancestorMap.addEmpty(toId(root));
	}

	while (store.count > 0) {
		const [ node, ancestors ] = store.dequeue()!;
		const nodeId = toId(node);

		if (ancestors)
			ancestorMap.add(nodeId, ancestors);

		const children = node.children;
		if (children?.length) {
			const childAncestors = ancestors ? [ nodeId, ...ancestors ] : [ nodeId ];
			store.enqueue(children.map(node => [ node, childAncestors ] as Stored));
		}
	}

	return ancestorMap;
};

/** @internalexport */
export const nodesToRelations = <Item, Id = Item>(
	roots: Some<HCNode<Item>>,
	identify?: Identify<Item, Id>,
): Relation<Id>[] => {
	const relations: Relation<Id>[] = [];
	const toId = nodeToIdProjection(identify);

	flattenGraphNext({
		roots,
		next: node => {
			const { isLeaf, isRoot } = node;

			if (isLeaf && isRoot) {
				const nodeId = toId(node);
				relations.push([ nodeId ]);

				return;
			}

			if (isLeaf)
				return;

			const nodeId = toId(node);
			const children = node.children;
			const childIds = children.map(toId);
			for (const childId of childIds)
				relations.push([ nodeId, childId ]);

			return children.filter(child => child.isInternal);
		},
		...traversalOptions(),
	});

	return relations;
};

import { MultiMap, Queue, someToArray, someToIterable, type Some } from '@loken/utilities';
import type { Relation } from '../relations/relation.types.ts';
import { flattenGraphNext } from '../traversal/graph-flatten.ts';
import type { Identify } from '../utilities/identify.ts';
import { nodeToId, nodesToIds } from './node-conversion.ts';
import type { HCNode } from './node.ts';


/** @internalexport */
export const nodesToChildMap = <Item, Id = Item>(
	roots: Some<HCNode<Item>>,
	identify?: Identify<Item, Id>,
	childMap = new MultiMap<Id>(),
): MultiMap<Id> => {
	for (const root of someToIterable(roots)) {
		const nodeId = nodeToId(root, identify);
		if (root.isInternal) {
			const childIds = nodesToIds(root.getChildren(), identify);
			childMap.add(nodeId, childIds);
		}
		else {
			childMap.addEmpty(nodeToId(root, identify));
		}
	}

	const nodes = flattenGraphNext({
		roots,
		next: node => node.getChildren().filter(n => n.isInternal),
	});

	for (const node of nodes) {
		const childNodes = node.getChildren();
		const nodeId = nodeToId(node, identify);
		const childIds = nodesToIds(childNodes, identify);
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
	const store = new Queue<Stored>();
	store.enqueue(roots.map(node => [ node, [] ] as Stored));

	for (const root of roots)
		descendantMap.addEmpty(nodeToId(root, identify));

	while (store.count > 0) {
		const [ node, ancestors ] = store.dequeue()!;
		const nodeId = nodeToId(node, identify);

		for (const ancestor of ancestors)
			ancestor.add(nodeId);

		const children = node.getChildren();
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
	const store = new Queue<Stored>();
	store.enqueue(roots.map(node => [ node ] as Stored));

	for (const root of roots) {
		if (root.isLeaf)
			ancestorMap.addEmpty(nodeToId(root, identify));
	}

	while (store.count > 0) {
		const [ node, ancestors ] = store.dequeue()!;
		const nodeId = nodeToId(node, identify);

		if (ancestors)
			ancestorMap.add(nodeId, ancestors);

		const children = node.getChildren();
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

	flattenGraphNext({
		roots,
		next: node => {
			const { isLeaf, isRoot } = node;

			if (isLeaf && isRoot) {
				const nodeId = nodeToId(node, identify);
				relations.push([ nodeId ]);

				return;
			}

			if (isLeaf)
				return;

			const nodeId = nodeToId(node, identify);
			const children = node.getChildren();
			const childIds = nodesToIds(children, identify);
			for (const childId of childIds)
				relations.push([ nodeId, childId ]);

			return children.filter(child => child.isInternal);
		},
	});

	return relations;
};

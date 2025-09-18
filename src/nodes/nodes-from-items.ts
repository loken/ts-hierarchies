import { type Some, MultiMap, someToArray, someToIterable } from '@loken/utilities';
import type { Identify } from '../utilities/identify.ts';
import { HCNode } from './node.ts';
import { flattenGraphNext } from '../traversal/graph-flatten.ts';
import type { GetChildren, GetParent } from '../utilities/related-items.ts';
import { traversalOptions } from '../traversal/graph.types.ts';


/** @internalexport */
export const nodesFromChildMapWithItems = <Item, Id>(
	items: Some<Item>,
	identify: Identify<Item, Id>,
	childMap: MultiMap<Id>,
): HCNode<Item>[] => {
	const nodes = new Map<Id, HCNode<Item>>();
	const roots = new Map<Id, HCNode<Item>>();

	for (const item of someToIterable(items)) {
		const id = identify(item);
		const node = new HCNode(item);

		nodes.set(id, node);

		if (childMap.has(id))
			roots.set(id, node);
	}

	for (const [ parentId, childIds ] of childMap.entries()) {
		const parentNode = nodes.get(parentId);
		if (!parentNode)
			throw new Error(`Parent item with ID '${ parentId }' not found in provided items.`);

		for (const childId of childIds) {
			const childNode = nodes.get(childId);
			if (!childNode)
				throw new Error(`Child item with ID '${ childId }' not found in provided items.`);

			parentNode.attach(childNode);
			roots.delete(childId);
		}
	}

	return roots.values().toArray();
};


/** @internalexport */
export const nodesFromChildItems = <Item>(
	roots: Some<Item>,
	children: GetChildren<Item>,
): HCNode<Item>[] => {
	const rootNodes = someToArray(roots).map(item => new HCNode(item));

	flattenGraphNext({
		roots: rootNodes,
		next:  (node) => {
			const childItems = children(node.item);
			if (childItems?.length) {
				const childNodes = childItems.map(childItem => new HCNode(childItem));
				node.attach(childNodes);

				return childNodes;
			}
		},
		...traversalOptions(),
	});

	return rootNodes;
};


/** @internalexport */
export const nodesFromParentItems = <Item>(
	leaves: Some<Item>,
	parent: GetParent<Item>,
): HCNode<Item>[] => {
	const nodes = new Map<Item, HCNode<Item>>();
	const roots: HCNode<Item>[] = [];

	for (const leaf of someToIterable(leaves)) {
		let currentItem = leaf;
		let currentNode = getNode(leaf);

		while (true) {
			const parentItem = parent(currentItem);
			if (parentItem !== undefined) {
				const parentSeen = nodes.has(parentItem);
				const parentNode = getNode(parentItem);

				parentNode.attach(currentNode);

				if (parentSeen)
					break;

				currentItem = parentItem;
				currentNode = parentNode;
			}
			else {
				roots.push(currentNode);
				break;
			}
		}
	}

	return roots;

	function getNode(item: Item): HCNode<Item> {
		let node = nodes.get(item);
		if (!node) {
			node = new HCNode(item);
			nodes.set(item, node);
		}

		return node;
	}
};

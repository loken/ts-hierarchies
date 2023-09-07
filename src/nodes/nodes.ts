import { iterateAll, iterateMultiple, mapGetLazy, MultiMap, type Multiple } from '@loken/utilities';

import { traverseGraph } from '../traversal/traverse-graph.js';
import { Node } from './node.js';
import { type Identify, nodesToIds, nodeToId } from './node-conversion.js';
import { type Relation } from './relations.js';

export class Nodes {

	/**
	 * Build nodes of IDs linked as described by the provided `childMap`.
	 *
	 * @template Id The type of IDs.
	 * @param childMap The map describing the relations.
	 * @returns The root nodes.
	 */
	public static assembleIds<Id>(childMap: MultiMap<Id>): Node<Id>[] {
		const nodes = new Map<Id, Node<Id>>();
		const roots = new Map<Id, Node<Id>>();

		for (const parentId of childMap.keys()) {
			const parentNode = new Node(parentId);
			roots.set(parentId, parentNode);
			nodes.set(parentId, parentNode);
		}

		for (const [ parentId, childIds ] of childMap.entries()) {
			const parentNode = nodes.get(parentId)!;

			for (const childId of childIds) {
				const childNode = mapGetLazy(nodes, childId, () => new Node(childId));
				parentNode.attach(childNode);
				roots.delete(childId);
			}
		}

		return [ ...roots.values() ];
	}

	/**
	 * Build nodes of `items` linked as described by the provided `childMap`.
	 *
	 * @template Item The type of item.
	 * @template Id The type of IDs.
	 * @param identify Means of getting an ID for an item.
	 * @param items The items to wrap in nodes.
	 * @param childMap The map describing the relations.
	 * @returns The root nodes.
	 */
	public static assembleItems<Item, Id>(options: {
		identify: Identify<Item, Id>,
		items: Multiple<Item>,
		childMap: MultiMap<Id>,
	}): Node<Item>[] {
		const { identify, items, childMap } = options;
		const nodes = new Map<Id, Node<Item>>();
		const roots = new Map<Id, Node<Item>>();

		for (const item of iterateMultiple(items)) {
			const id = identify(item);
			const node = new Node(item);

			nodes.set(id, node);

			if (childMap.has(id))
				roots.set(id, node);
		}

		for (const [ parentId, childIds ] of childMap.entries()) {
			const parent = nodes.get(parentId)!;

			for (const childId of childIds) {
				const childNode = nodes.get(childId)!;
				parent.attach(childNode);
				roots.delete(childId);
			}
		}

		return [ ...roots.values() ];
	}

	/**
	 * Create a map of ids to child-ids by traversing the graph of the `roots`.
	 *
	 * @template Item The type of item.
	 * @template Id The type of IDs.
	 * @param roots The roots to use for traversal.
	 * @param identify Means of getting an ID for an item.
	 * @returns A parent-to-children map of IDs.
	 */
	public static toChildMap<Item, Id = Item>(
		roots: Multiple<Node<Item>>,
		identify?: Identify<Item, Id>,
	): MultiMap<Id> {
		const map = new MultiMap<Id>();

		const traversal = traverseGraph({
			roots,
			signal: (node, signal) => {
				signal.next(node.children);

				if (!node.isLeaf) {
					const nodeId: Id = nodeToId(node, identify);
					const ids = nodesToIds(node.children, identify);
					map.add(nodeId, ids);
				}
			},
		});

		iterateAll(traversal);

		return map;
	}

	/**
	 * Create a map of ids to descendant-ids by traversing the graph of the `roots`.
	 *
	 * @template Item The type of item.
	 * @template Id The type of IDs.
	 * @param roots The roots to use for traversal.
	 * @param identify Means of getting an ID for an item.
	 * @returns A parent-to-descendant map of IDs.
	 */
	public static toDescendantMap<Item, Id = Item>(
		roots: Multiple<Node<Item>>,
		identify?: Identify<Item, Id>,
	): MultiMap<Id> {
		const map = new MultiMap<Id>();

		const traversal = traverseGraph({
			roots,
			signal: (node, signal) => {
				signal.next(node.children);

				const nodeId: Id = nodeToId(node, identify);

				for (const ancestor of node.getAncestors()) {
					const ancestorId = nodeToId(ancestor, identify);
					map.add(ancestorId, nodeId);
				}
			},
		});

		iterateAll(traversal);

		return map;
	}

	/**
	 * Create a map of ids to ancestor-ids by traversing the graph of the `roots`.
	 *
	 * @template Item The type of item.
	 * @template Id The type of IDs.
	 * @param roots The roots to use for traversal.
	 * @param identify Means of getting an ID for an item.
	 * @returns A parent-to-descendant map of IDs.
	 */
	public static toAncestorMap<Item, Id = Item>(
		roots: Multiple<Node<Item>>,
		identify?: Identify<Item, Id>,
	): MultiMap<Id> {
		const map = new MultiMap<Id>();

		const traversal = traverseGraph({
			roots,
			signal: (node, signal) => {
				signal.next(node.children);

				const nodeId: Id = nodeToId(node, identify);

				for (const ancestor of node.getAncestors()) {
					const ancestorId = nodeToId(ancestor, identify);
					map.add(nodeId, ancestorId);
				}
			},
		});

		iterateAll(traversal);

		return map;
	}

	/**
	 * Create a list of relations by traversing the graph of the `roots`.
	 *
	 * @template Item The type of item.
	 * @template Id The type of IDs.
	 * @param roots The roots to use for traversal.
	 * @param identify Means of getting an ID for an item.
	 * @returns An array of `Relation<Id>`s.
	 */
	public static toRelations<Item, Id = Item>(
		roots: Multiple<Node<Item>>,
		identify?: Identify<Item, Id>,
	): Relation<Id>[] {
		const relations: Relation<Id>[] = [];

		const traversal = traverseGraph({
			roots,
			signal: (node, signal) => {
				signal.next(node.children);

				if (!node.isLeaf) {
					const nodeId: Id = nodeToId(node, identify);
					for (const child of node.children)
						relations.push([ nodeId, nodeToId(child, identify) ]);
				}
			},
		});

		iterateAll(traversal);

		return relations;
	}

}

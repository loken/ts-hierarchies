import { iterateAll, iterateMultiple, mapArgs, mapGetLazy, MultiMap, type Multiple, spreadMultiple } from '@loken/utilities';

import { traverseGraph } from '../traversal/traverse-graph.js';
import type { TraversalType } from '../traversal/traverse-types.js';
import type { Identify } from '../utilities/identify.js';
import type { GetChildren } from '../utilities/related-items.js';
import type { Relation } from '../utilities/relations.js';
import { HCNode } from './node.js';
import { nodesToIds, nodesToItems, nodeToId } from './node-conversion.js';

export class Nodes {

	/**
	 * Create one or more nodes.
	 *
	 * @items One or more `Item`s to wrap in nodes.
	 * @returns One node when you pass one item and a fixed length tuple of nodes when you pass multiple items.
	 * @throws Must provide at least one argument.
	 */
	public static create<Items extends any[]>(...items: Items) {
		return mapArgs(items, item => new HCNode(item), true, false);
	}

	/**
	 * Build nodes of IDs linked as described by the provided `childMap`.
	 *
	 * @template Id The type of IDs.
	 * @param childMap The map describing the relations.
	 * @returns The root nodes.
	 */
	public static assembleIds<Id>(childMap: MultiMap<Id>): HCNode<Id>[] {
		const nodes = new Map<Id, HCNode<Id>>();
		const roots: HCNode<Id>[] = [];

		for (const parentId of childMap.keys()) {
			const parentNode = new HCNode(parentId);
			nodes.set(parentId, parentNode);
		}

		for (const [ parentId, childIds ] of childMap.entries()) {
			const parentNode = nodes.get(parentId)!;

			for (const childId of childIds) {
				const childNode = mapGetLazy(nodes, childId, () => new HCNode(childId));
				parentNode.attach(childNode);
			}
		}

		for (const node of nodes.values()) {
			if (node.isRoot)
				roots.push(node);
		}

		return roots;
	}

	/**
	 * Build nodes of `items` linked as described by the provided `childMap`.
	 *
	 * @template Item The type of item.
	 * @template Id The type of IDs.
	 * @param items The items to wrap in nodes.
	 * @param identify Means of getting an ID for an item.
	 * @param childMap The map describing the relations.
	 * @returns The root nodes.
	 */
	public static assembleItems<Item, Id>(
		items: Multiple<Item>,
		identify: Identify<Item, Id>,
		childMap: MultiMap<Id>,
	): HCNode<Item>[] {
		const nodes = new Map<Id, HCNode<Item>>();
		const roots: HCNode<Item>[] = [];

		for (const item of iterateMultiple(items)) {
			const id = identify(item);
			const node = new HCNode(item);

			nodes.set(id, node);
		}

		for (const [ parentId, childIds ] of childMap.entries()) {
			const parent = nodes.get(parentId)!;

			for (const childId of childIds) {
				const childNode = nodes.get(childId)!;
				parent.attach(childNode);
			}
		}

		for (const node of nodes.values()) {
			if (node.isRoot)
				roots.push(node);
		}

		return roots;
	}

	/**
	 * Build nodes of `items` linked as described by the provided `children`.
	 *
	 * @template Item The type of item.
	 * @template Id The type of IDs.
	 * @param items The items to wrap in nodes.
	 * @param children The delegate for getting the child items from a parent item.
	 * @returns The root nodes.
	 */
	public static assembleItemsFromChildren<Item>(
		items: Multiple<Item>,
		children: GetChildren<Item>,
	) {
		const roots = traverseGraph({
			roots:  Nodes.create(...spreadMultiple(items)) as HCNode<Item>[],
			signal: (node, signal) => {
				if (signal.depth > 0)
					signal.skip();

				const childItems = children(node.item);
				if (childItems) {
					const childNodes = childItems.map(childItem => new HCNode(childItem));
					node.attach(childNodes);
					signal.next(childNodes);
				}
			},
		});

		return [ ...roots ];
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
		roots: Multiple<HCNode<Item>>,
		identify?: Identify<Item, Id>,
	): MultiMap<Id> {
		const map = new MultiMap<Id>();

		const traversal = traverseGraph({
			roots,
			signal: (node, signal) => {
				signal.next(node.getChildren());

				if (!node.isLeaf) {
					const nodeId: Id = nodeToId(node, identify);
					const ids = nodesToIds(node.getChildren(), identify);
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
		roots: Multiple<HCNode<Item>>,
		identify?: Identify<Item, Id>,
	): MultiMap<Id> {
		const map = new MultiMap<Id>();

		const traversal = traverseGraph({
			roots,
			signal: (node, signal) => {
				signal.next(node.getChildren());

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
		roots: Multiple<HCNode<Item>>,
		identify?: Identify<Item, Id>,
	): MultiMap<Id> {
		const map = new MultiMap<Id>();

		const traversal = traverseGraph({
			roots,
			signal: (node, signal) => {
				signal.next(node.getChildren());

				const nodeId: Id = nodeToId(node, identify);

				for (const ancestor of node.getAncestors(false)) {
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
		roots: Multiple<HCNode<Item>>,
		identify?: Identify<Item, Id>,
	): Relation<Id>[] {
		const relations: Relation<Id>[] = [];

		const traversal = traverseGraph({
			roots,
			signal: (node, signal) => {
				signal.next(node.getChildren());

				if (!node.isLeaf) {
					const nodeId: Id = nodeToId(node, identify);
					for (const child of node.getChildren())
						relations.push([ nodeId, nodeToId(child, identify) ]);
				}
			},
		});

		iterateAll(traversal);

		return relations;
	}


	/** Get descendant nodes by traversing according to the options. */
	public static getDescendants<Item>(
		roots: Multiple<HCNode<Item>>,
		includeSelf = false,
		type: TraversalType = 'breadth-first',
	) {
		return [ ...Nodes.traverseDescendants(roots, includeSelf, type) ];
	}

	/** Get descendant nodes by traversing according to the options. */
	public static getDescendantItems<Item>(
		roots: Multiple<HCNode<Item>>,
		includeSelf = false,
		type: TraversalType = 'breadth-first',
	) {
		return nodesToItems(Nodes.traverseDescendants(roots, includeSelf, type));
	}

	/** Generate a sequence of descendant nodes by traversing according to the options. */
	public static traverseDescendants<Item>(
		roots: Multiple<HCNode<Item>>,
		includeSelf = false,
		type: TraversalType = 'breadth-first',
	) {
		const effectiveRoots = includeSelf ? roots : spreadMultiple(roots).map(root => root.getChildren()).reduce((children, rootChildren) => {
			if (rootChildren.length)
				children.unshift(...rootChildren);

			return children;
		});

		return traverseGraph({
			roots: effectiveRoots,
			next:  node => node.getChildren(),
			type,
		});
	}

}

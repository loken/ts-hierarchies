import { iterateAll, iterateMultiple, mapArgs, mapGetLazy, MultiMap, type Multiple, spreadMultiple } from '@loken/utilities';

import { traverseGraph } from '../traversal/traverse-graph.js';
import { traverseSequence } from '../traversal/traverse-sequence.js';
import type { TraversalType } from '../traversal/traverse-types.js';
import type { Identify } from '../utilities/identify.js';
import type { GetChildren, GetParent } from '../utilities/related-items.js';
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
	 * Will exclude any `items` that are not mentioned in the `childMap`.
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
		const roots: HCNode<Item>[] = [];

		const nodeMap = new Map<Id, HCNode<Item>>();
		const itemMap = new Map<Id, Item>();
		const getItem = (id: Id) => {
			if (!itemMap.has(id))
				throw new Error(`Could not find item for mapped ID: ${ id }`);

			return itemMap.get(id);
		};

		for (const item of iterateMultiple(items))
			itemMap.set(identify(item), item);

		for (const [ parentId, childIds ] of childMap.entries()) {
			const parentNode = mapGetLazy(nodeMap, parentId, () => new HCNode(getItem(parentId)));

			for (const childId of childIds) {
				const childNode = mapGetLazy(nodeMap, childId, () => new HCNode(getItem(childId)));
				parentNode.attach(childNode);
			}
		}

		for (const node of nodeMap.values()) {
			if (node.isRoot)
				roots.push(node);
		}

		return roots;
	}

	/**
	 * Build nodes of `Item`s linked as described by the provided `roots` and `children` delegate.
	 *
	 * @template Item The type of item.
	 * @template Id The type of IDs.
	 * @param roots The root items to wrap in nodes.
	 * @param children The delegate for getting the child items from a parent item.
	 * @returns The root nodes.
	 */
	public static assembleItemsWithChildren<Item>(
		roots: Multiple<Item>,
		children: GetChildren<Item>,
	) {
		const rootNodes = traverseGraph({
			roots:  Nodes.create(...spreadMultiple(roots)) as HCNode<Item>[],
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

		return [ ...rootNodes ];
	}

	/**
	 * Build nodes of ´Item´s linked as described by the provided `leaves` and `parent` delegate.
	 *
	 * @template Item The type of item.
	 * @template Id The type of IDs.
	 * @param leaves The leaf items to wrap in nodes.
	 * @param parent The delegate for getting the parent of an item.
	 * @returns The root nodes.
	 */
	public static assembleItemsWithParents<Item>(
		leaves: Multiple<Item>,
		parent: GetParent<Item>,
	) {
		const nodes = new Map<Item, HCNode<Item>>();
		const roots: HCNode<Item>[] = [];

		for (const leaf of iterateMultiple(leaves)) {
			const leafNode = new HCNode(leaf);
			nodes.set(leaf, leafNode);

			iterateAll(traverseSequence({
				first:  leafNode,
				signal: (node, signal) => {
					const parentItem = parent(node.item);
					if (!parentItem) {
						roots.push(node);

						return;
					}

					let parentNode = nodes.get(parentItem);
					if (!parentNode) {
						parentNode = new HCNode(parentItem);
						nodes.set(parentItem, parentNode);
						signal.next(parentNode);
					}

					parentNode.attach(node);
				},
			}));
		}

		return roots;
	}

	/**
	 * Create a map of ids to child-ids by traversing the graph of the `roots`.
	 *
	 * @template Item The type of item.
	 * @template Id The type of IDs.
	 * @param roots The roots to use for traversal.
	 * @param identify Means of getting an ID for an item.
	 * @param childMap An existing or new child-map.
	 * @returns A parent-to-child map of IDs.
	 */
	public static toChildMap<Item, Id = Item>(
		roots: Multiple<HCNode<Item>>,
		identify?: Identify<Item, Id>,
		childMap = new MultiMap<Id>(),
	): MultiMap<Id> {
		const traversal = traverseGraph({
			roots,
			signal: (node, signal) => {
				if (!node.isLeaf) {
					const childNodes = node.getChildren();
					const nodeId = nodeToId(node, identify);
					const childIds = nodesToIds(childNodes, identify);

					childMap.add(nodeId, childIds);

					signal.next(childNodes);
				}
				else if (signal.depth === 0) {
					const nodeId = nodeToId(node, identify);

					childMap.getOrAdd(nodeId);
				}
			},
		});

		iterateAll(traversal);

		return childMap;
	}

	/**
	 * Create a map of ids to descendant-ids by traversing the graph of the `roots`.
	 *
	 * @template Item The type of item.
	 * @template Id The type of IDs.
	 * @param roots The roots to use for traversal.
	 * @param identify Means of getting an ID for an item.
	 * @param descendantMap An existing or new descendant-map.
	 * @returns A parent-to-descendant map of IDs.
	 */
	public static toDescendantMap<Item, Id = Item>(
		roots: Multiple<HCNode<Item>>,
		identify?: Identify<Item, Id>,
		descendantMap = new MultiMap<Id>(),
	): MultiMap<Id> {
		const rootIds = new Set<Id>();

		const traversal = traverseGraph({
			roots,
			signal: (node, signal) => {
				if (!node.isLeaf)
					signal.next(node.getChildren());

				const nodeId: Id = nodeToId(node, identify);

				if (signal.depth === 0) {
					rootIds.add(nodeId);

					if (node.isLeaf)
						descendantMap.getOrAdd(nodeId);

					return;
				}

				for (const ancestor of node.traverseAncestors(false)) {
					const ancestorId = nodeToId(ancestor, identify);
					descendantMap.add(ancestorId, nodeId);

					// We don't want to include ancestors of our roots.
					if (rootIds.has(ancestorId))
						break;
				}
			},
		});

		iterateAll(traversal);

		return descendantMap;
	}

	/**
	 * Create a map of ids to ancestor-ids by traversing the graph of the `roots`.
	 *
	 * @template Item The type of item.
	 * @template Id The type of IDs.
	 * @param roots The roots to use for traversal.
	 * @param identify Means of getting an ID for an item.
	 * @param ancestorMap An existing or new ancestor-map.
	 * @returns A child-to-ancestor map of IDs.
	 */
	public static toAncestorMap<Item, Id = Item>(
		roots: Multiple<HCNode<Item>>,
		identify?: Identify<Item, Id>,
		ancestorMap = new MultiMap<Id>(),
	): MultiMap<Id> {
		const rootIds = new Set<Id>();

		const traversal = traverseGraph({
			roots,
			signal: (node, signal) => {
				if (!node.isLeaf)
					signal.next(node.getChildren());

				const nodeId: Id = nodeToId(node, identify);

				if (signal.depth === 0) {
					rootIds.add(nodeId);

					if (node.isLeaf)
						ancestorMap.getOrAdd(nodeId);

					return;
				}

				for (const ancestor of node.traverseAncestors(false)) {
					const ancestorId = nodeToId(ancestor, identify);
					ancestorMap.add(nodeId, ancestorId);

					// We don't want to include ancestors of our roots.
					if (rootIds.has(ancestorId))
						break;
				}
			},
		});

		iterateAll(traversal);

		return ancestorMap;
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

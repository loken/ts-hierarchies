import { iterateAll, mapArgs, mapGetLazy, MultiMap, type Some, someToArray, someToIterable, someToSet } from '@loken/utilities';

import { flattenGraph, traverseGraph } from '../traversal/traverse-graph.js';
import { flattenSequence, traverseSequence } from '../traversal/traverse-sequence.js';
import type { TraversalType } from '../traversal/traverse-types.js';
import { ChildMap } from '../utilities/child-map.js';
import type { Identify } from '../utilities/identify.js';
import type { GetChildren, GetParent } from '../utilities/related-items.js';
import type { Relation } from '../utilities/relations.js';
import { HCNode } from './node.js';
import type { NodePredicate } from './node.types.js';
import { nodesToIds, nodeToId } from './node-conversion.js';

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
	 * Create some nodes.
	 *
	 * @items One or more `Item`s to wrap in nodes.
	 * @returns An array of nodes containing the items.
	 * @throws Must provide at least one argument.
	 */
	public static createSome<Item>(items: Some<Item>) {
		return someToArray(items).map(item => new HCNode(item));
	}

	/**
	 * Build nodes of IDs linked as described by the provided `childMap`.
	 *
	 * @template Id The type of IDs.
	 * @param childMap The map describing the relations.
	 * @returns The root nodes.
	 */
	public static assembleIds<Id>(childMap: MultiMap<Id>): HCNode<Id>[] {
		const nodes: Map<Id, HCNode<Id>> = new Map();
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
	 * Build nodes of IDs recursively from the property keys.
	 *
	 * @param source The object describing the relations.
	 * @param include Optional predicate used for determining whether a property should be included as an ID.
	 * @returns The root nodes.
	 */
	public static assemblePropertyIds(source: object, include?: (prop: string, val: any) => boolean): HCNode<string>[] {
		return Nodes.assembleIds(ChildMap.fromPropertyIds(source, include));
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
		items: Some<Item>,
		identify: Identify<Item, Id>,
		childMap: MultiMap<Id>,
	): HCNode<Item>[] {
		const roots: HCNode<Item>[] = [];

		const nodeMap: Map<Id, HCNode<Item>> = new Map();
		const itemMap: Map<Id, Item> = new Map();
		const getItem = (id: Id) => {
			if (!itemMap.has(id))
				throw new Error(`Could not find item for mapped ID: ${ id }`);

			return itemMap.get(id);
		};

		for (const item of someToIterable(items))
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
		roots: Some<Item>,
		children: GetChildren<Item>,
	) {
		const rootNodes = traverseGraph({
			roots:  Nodes.createSome(roots),
			signal: (node, signal) => {
				if (signal.depth > 0)
					signal.skip();

				const childItems = children(node.item);
				if (childItems?.length) {
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
		leaves: Some<Item>,
		parent: GetParent<Item>,
	) {
		const nodes: Map<Item, HCNode<Item>> = new Map();
		const roots: HCNode<Item>[] = [];

		for (const leaf of someToIterable(leaves)) {
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
		roots: Some<HCNode<Item>>,
		identify?: Identify<Item, Id>,
		childMap: MultiMap<Id> = new MultiMap(),
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
		roots: Some<HCNode<Item>>,
		identify?: Identify<Item, Id>,
		descendantMap: MultiMap<Id> = new MultiMap(),
	): MultiMap<Id> {
		const rootSet = someToSet(roots);

		const traversal = traverseGraph({
			roots,
			signal: (node, signal) => {
				if (!node.isLeaf)
					signal.next(node.getChildren());

				const nodeId: Id = nodeToId(node, identify);

				if (signal.depth === 0) {
					if (node.isLeaf)
						descendantMap.getOrAdd(nodeId);

					return;
				}

				// Get ancestors starting with the parent and ending with the roots,
				// for the case where the roots are not actual roots, just acting as such.
				const ancestors = flattenSequence({
					first: node.getParent(),
					next:  node => rootSet.has(node) ? undefined : node.getParent(),
				});

				for (const ancestorId of nodesToIds(ancestors, identify))
					descendantMap.add(ancestorId, nodeId);
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
		roots: Some<HCNode<Item>>,
		identify?: Identify<Item, Id>,
		ancestorMap: MultiMap<Id> = new MultiMap(),
	): MultiMap<Id> {
		const rootSet = someToSet(roots);

		const traversal = traverseGraph({
			roots,
			signal: (node, signal) => {
				if (!node.isLeaf)
					signal.next(node.getChildren());

				const nodeId: Id = nodeToId(node, identify);

				if (signal.depth === 0) {
					if (node.isLeaf)
						ancestorMap.getOrAdd(nodeId);

					return;
				}

				// Get ancestors starting with the parent and ending with the roots,
				// for the case where the roots are not actual roots, just acting as such.
				const ancestors = flattenSequence({
					first: node.getParent(),
					next:  node => rootSet.has(node) ? undefined : node.getParent(),
				});

				ancestorMap.add(nodeId, nodesToIds(ancestors, identify));
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
		roots: Some<HCNode<Item>>,
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
		roots: Some<HCNode<Item>>,
		includeSelf = false,
		type: TraversalType = 'breadth-first',
	) {
		return flattenGraph({
			roots: this.getRoots(roots, includeSelf),
			next:  node => node.getChildren(),
			type,
		});
	}

	/** Get descendant items by traversing according to the options. */
	public static getDescendantItems<Item>(
		roots: Some<HCNode<Item>>,
		includeSelf = false,
		type: TraversalType = 'breadth-first',
	) {
		return this.getDescendants(roots, includeSelf, type).map(node => node.item);
	}

	/** Generate a sequence of descendant nodes by traversing according to the options. */
	public static traverseDescendants<Item>(
		roots: Some<HCNode<Item>>,
		includeSelf = false,
		type: TraversalType = 'breadth-first',
	) {
		return traverseGraph({
			roots: this.getRoots(roots, includeSelf),
			next:  node => node.getChildren(),
			type,
		});
	}


	/** Find the common ancestor node which is the closest to the `nodes`. */
	public static findCommonAncestor<Item>(nodes: Some<HCNode<Item>>) {
		const commonAncestors = someToArray(nodes).reduce((acc, curr) => {
			const ancestors = new Set(curr.getAncestors(true));

			return !acc ? ancestors : acc.intersection(ancestors);
		}, null as Set<HCNode<Item>> | null);

		return commonAncestors?.values().next().value;
	}


	/** Find the first ancestor node matching the `search`. */
	public static findAncestor<Item>(roots: Some<HCNode<Item>>, search: NodePredicate<Item>, includeSelf = false) {
		for (const root of someToIterable(roots)) {
			const ancestor = root.findAncestor(search, includeSelf);
			if (ancestor)
				return ancestor;
		}

		return undefined;
	}

	/** Find the first ancestor node matching the `search`. */
	public static findAncestors<Item>(roots: Some<HCNode<Item>>, search: NodePredicate<Item>, includeSelf = false) {
		return someToArray(roots).reduce((ancestors, root) => {
			ancestors.push(...root.findAncestors(search, includeSelf));

			return ancestors;
		}, [] as HCNode<Item>[]);
	}

	/** Find the first descendant node matching the `search`. */
	public static findDescendant<Item>(roots: Some<HCNode<Item>>, search: NodePredicate<Item>, includeSelf = false, type: TraversalType = 'breadth-first') {
		return flattenGraph({
			roots:  this.getRoots(roots, includeSelf),
			signal: (n, s) => {
				if (search(n)) {
					s.end();
				}
				else {
					s.skip();
					s.next(n.getChildren());
				}
			},
			type,
		})[0];
	}

	/** Find the descendant nodes matching the `search`. */
	public static findDescendants<Item>(roots: Some<HCNode<Item>>, search: NodePredicate<Item>, includeSelf = false, type: TraversalType = 'breadth-first') {
		return flattenGraph({
			roots:  this.getRoots(roots, includeSelf),
			signal: (n, s) => {
				if (!search(n))
					s.skip();

				s.next(n.getChildren());
			},
			type,
		});
	}


	/** Does an ancestor node matching the `search` exist? */
	public static hasAncestor<Item>(roots: Some<HCNode<Item>>, search: NodePredicate<Item>, includeSelf = false) {
		return this.findAncestor(roots, search, includeSelf) !== undefined;
	}

	/** Does a descendant node matching the `search` exist? */
	public static hasDescendant<Item>(roots: Some<HCNode<Item>>, search: NodePredicate<Item>, includeSelf = false, type: TraversalType = 'breadth-first') {
		return this.findDescendant(roots, search, includeSelf, type) !== undefined;
	}


	private static getRoots<Item>(roots: Some<HCNode<Item>>, includeSelf = false) {
		return includeSelf ? roots : someToArray(roots).map(root => root.getChildren()).reduce((children, rootChildren) => {
			if (rootChildren.length)
				children.unshift(...rootChildren);

			return children;
		});
	}

}

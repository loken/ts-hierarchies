import { isSomeItem, mapArgs, mapGetLazy, MultiMap, Queue, type Some, someToArray, someToIterable } from '@loken/utilities';

import { traverseGraph } from '../traversal/graph-traverse.js';
import type { TraversalType } from '../traversal/graph.types.js';
import { ChildMap } from '../utilities/child-map.js';
import type { Identify } from '../utilities/identify.js';
import type { GetChildren, GetParent } from '../utilities/related-items.js';
import type { Relation } from '../utilities/relations.js';
import { HCNode } from './node.js';
import type { NodePredicate } from './node.types.js';
import { nodesToIds, nodeToId } from './node-conversion.js';
import { flattenGraphNext, flattenGraph } from '../traversal/graph-flatten.js';
import { searchGraph, searchGraphMany } from '../traversal/graph-search.js';
import { flattenSequence } from '../traversal/sequence-flatten.js';
import { searchSequence, searchSequenceMany } from '../traversal/sequence-search.js';

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
	 * @throws {Error} When a parent or child ID referenced in the `childMap`
	 * is not found in the provided `items`.
	 */
	public static assembleItems<Item, Id>(
		items: Some<Item>,
		identify: Identify<Item, Id>,
		childMap: MultiMap<Id>,
	): HCNode<Item>[] {
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
		const rootNodes = Nodes.createSome(roots);

		flattenGraphNext({
			roots: rootNodes,
			next:  node => {
				const childItems = children(node.item);
				if (childItems?.length) {
					const childNodes = childItems.map(childItem => new HCNode(childItem));
					node.attach(childNodes);

					return childNodes;
				}
			},
		});

		return rootNodes;
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

		function getNode(item: Item) {
			let node = nodes.get(item);
			if (!node) {
				node = new HCNode(item);
				nodes.set(item, node);
			}

			return node;
		}
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
		childMap = new MultiMap<Id>(),
	): MultiMap<Id> {
		for (const root of someToIterable(roots)) {
			const nodeId = nodeToId(root, identify);
			if (root.isInternal) {
				const childIds = nodesToIds(root.getChildren(), identify);
				childMap.add(nodeId, childIds);
			}
			else {
				childMap.getOrAdd(nodeToId(root, identify));
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
		descendantMap = new MultiMap<Id>(),
	): MultiMap<Id> {
		roots = someToArray(roots);

		type Stored = [ node: HCNode<Item>, ancestors: Set<Id>[] ];
		const store = new Queue<Stored>();
		store.enqueue(roots.map(node => [ node, [] ] as Stored));

		for (const root of roots)
			descendantMap.getOrAdd(nodeToId(root, identify));

		while (store.count > 0) {
			const [ node, ancestors ] = store.dequeue()!;
			const nodeId = nodeToId(node, identify);

			for (const ancestor of ancestors)
				ancestor.add(nodeId);

			const children = node.getChildren();
			if (children?.length) {
				const nodeDescendants = descendantMap.getOrAdd(nodeId);
				const childAncestors = [ ...ancestors, nodeDescendants ];
				store.enqueue(children.map(node => [ node, childAncestors ] as Stored));
			}
		}

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
		ancestorMap = new MultiMap<Id>(),
	): MultiMap<Id> {
		roots = someToArray(roots);

		type Stored = [ node: HCNode<Item>, ancestors?: Id[] ];
		const store = new Queue<Stored>();
		store.enqueue(roots.map(node => [ node ] as Stored));

		for (const root of roots) {
			if (root.isLeaf)
				ancestorMap.getOrAdd(nodeToId(root, identify));
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

		flattenGraphNext({
			roots,
			next: node => {
				if (node.isLeaf)
					return;

				const children = node.getChildren();
				const childIds = nodesToIds(children, identify);
				const nodeId = nodeToId(node, identify);
				for (const childId of childIds)
					relations.push([ nodeId, childId ]);

				return children.filter(child => child.isInternal);
			},
		});

		return relations;
	}


	/** Get unique ancestor nodes. */
	public static getAncestors<Item>(
		nodes: Some<HCNode<Item>>,
		includeSelf = false,
	) {
		if (isSomeItem(nodes))
			return nodes.getAncestors(includeSelf);

		const seen = new Set<HCNode<Item>>();
		const ancestors: HCNode<Item>[] = [];

		for (const node of someToIterable(nodes)) {
			const first = includeSelf ? node : node.getParent();
			if (!first || seen.has(first))
				continue;

			const unseenAncestors = flattenSequence({
				first,
				next: node => {
					const parent = node.getParent();
					if (!parent || seen.has(parent))
						return undefined;

					seen.add(node);

					return parent;
				},
			});

			ancestors.push(...unseenAncestors);
		}

		return ancestors;
	}

	/** Get ancestor items from unique ancestor nodes. */
	public static getAncestorItems<Item>(
		nodes: Some<HCNode<Item>>,
		includeSelf = false,
	) {
		return this.getAncestors(nodes, includeSelf).map(node => node.item);
	}


	/** Get descendant nodes by traversing according to the options. */
	public static getDescendants<Item>(
		roots: Some<HCNode<Item>>,
		includeSelf = false,
		type: TraversalType = 'breadth-first',
	) {
		return flattenGraph({
			roots: HCNode.getRoots(roots, includeSelf),
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
			roots: HCNode.getRoots(roots, includeSelf),
			next:  node => node.getChildren(),
			type,
		});
	}


	/** Find the common ancestor node which is the closest to the `nodes`. */
	public static findCommonAncestor<Item>(nodes: Some<HCNode<Item>>, includeSelf = false) {
		const commonAncestors = this.findCommonAncestorSet(nodes, includeSelf);

		return commonAncestors?.values().next().value;
	}

	/** Find the ancestor nodes common to the `nodes`. */
	public static findCommonAncestors<Item>(nodes: Some<HCNode<Item>>, includeSelf = false) {
		const commonAncestors = this.findCommonAncestorSet(nodes, includeSelf);

		return commonAncestors ? [ ...commonAncestors ] : undefined;
	}

	/** Find the ancestor nodes common to the `nodes`. */
	public static findCommonAncestorItems<Item>(nodes: Some<HCNode<Item>>, includeSelf = false) {
		const commonAncestors = this.findCommonAncestorSet(nodes, includeSelf);

		return commonAncestors ? [ ...commonAncestors ].map(n => n.item) : undefined;
	}

	/** Find the set of ancestor nodes common to the `nodes`. */
	public static findCommonAncestorSet<Item>(nodes: Some<HCNode<Item>>, includeSelf = false) {
		const commonAncestors = someToArray(nodes).reduce((acc, curr) => {
			const ancestors = new Set(curr.getAncestors(includeSelf));

			return !acc ? ancestors : acc.intersection(ancestors);
		}, null as Set<HCNode<Item>> | null);

		return commonAncestors;
	}


	/** Find the first ancestor node matching the `search`. */
	public static findAncestor<Item>(roots: Some<HCNode<Item>>, search: NodePredicate<Item>, includeSelf = false) {
		if (isSomeItem(roots))
			return roots.findAncestor(search, includeSelf);

		const seen = new Set<HCNode<Item>>();

		for (const root of roots) {
			const first = includeSelf ? root : root.getParent();
			if (!first || seen.has(first))
				continue;

			const found = searchSequence({
				first,
				next: node => {
					const parent = node.getParent();
					if (!parent || seen.has(parent))
						return undefined;

					seen.add(node);

					return parent;
				},
				search,
			});

			if (found)
				return found;
		}

		return undefined;
	}

	/** Find the first ancestor node matching the `search`. */
	public static findAncestors<Item>(roots: Some<HCNode<Item>>, search: NodePredicate<Item>, includeSelf = false) {
		if (isSomeItem(roots))
			return roots.findAncestors(search, includeSelf);

		const seen = new Set<HCNode<Item>>();
		const ancestors: HCNode<Item>[] = [];

		for (const root of roots) {
			const first = includeSelf ? root : root.getParent();
			if (!first || seen.has(first))
				continue;

			const found = searchSequenceMany({
				first,
				next: node => {
					const parent = node.getParent();
					if (!parent || seen.has(parent))
						return undefined;

					seen.add(node);

					return parent;
				},
				search,
			});

			ancestors.push(...found);
		}

		return ancestors;
	}

	/** Find the first descendant node matching the `search`. */
	public static findDescendant<Item>(roots: Some<HCNode<Item>>, search: NodePredicate<Item>, includeSelf = false, type: TraversalType = 'breadth-first') {
		return searchGraph({
			roots: HCNode.getRoots(roots, includeSelf),
			next:  node => node.getChildren(),
			search,
			type,
		});
	}

	/** Find the descendant nodes matching the `search`. */
	public static findDescendants<Item>(roots: Some<HCNode<Item>>, search: NodePredicate<Item>, includeSelf = false, type: TraversalType = 'breadth-first') {
		return searchGraphMany({
			roots: HCNode.getRoots(roots, includeSelf),
			next:  node => node.getChildren(),
			search,
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

}

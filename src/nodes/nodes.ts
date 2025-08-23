import { isSomeItem, mapArgs, MultiMap, type Some, someToArray, someToIterable } from '@loken/utilities';

import { traverseGraph } from '../traversal/graph-traverse.js';
import type { TraversalType } from '../traversal/graph.types.js';
import { ChildMap } from '../maps/child-map.js';
import type { Identify } from '../utilities/identify.js';
import type { GetChildren, GetParent } from '../utilities/related-items.js';
import type { Relation } from '../relations/relation.types.js';
import { HCNode } from './node.js';
import type { NodePredicate } from './node.types.js';
import { flattenGraph } from '../traversal/graph-flatten.js';
import { searchGraph, searchGraphMany } from '../traversal/graph-search.js';
import { flattenSequence } from '../traversal/sequence-flatten.js';
import { searchSequence, searchSequenceMany } from '../traversal/sequence-search.js';
import { nodesToAncestorMap, nodesToChildMap, nodesToDescendantMap, nodesToRelations } from './nodes-to.js';
import { relationsToNodes } from '../relations/relations-to.js';
import { childMapToNodes } from '../maps/maps-to.js';
import { nodesFromChildMapWithItems, nodesFromChildItems, nodesFromParentItems } from './nodes-from-items.js';

export class Nodes {

	//#region Factory methods
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
	public static fromChildMap<Id>(childMap: MultiMap<Id>): HCNode<Id>[] {
		return childMapToNodes(childMap);
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
	public static fromChildMapWithItems<Item, Id>(
		items: Some<Item>,
		identify: Identify<Item, Id>,
		childMap: MultiMap<Id>,
	): HCNode<Item>[] {
		return nodesFromChildMapWithItems(items, identify, childMap);
	}

	/**
	 * Build nodes of IDs linked as described by the provided `relations`.
	 *
	 * @template Id The type of IDs.
	 * @param relations The relations describing the hierarchy structure.
	 * @returns The root nodes.
	 */
	public static fromRelations<Id>(relations: Some<Relation<Id>>): HCNode<Id>[] {
		return relationsToNodes(relations);
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
	public static fromChildItems<Item>(
		roots: Some<Item>,
		children: GetChildren<Item>,
	) {
		return nodesFromChildItems(roots, children);
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
	public static fromParentItems<Item>(
		leaves: Some<Item>,
		parent: GetParent<Item>,
	) {
		return nodesFromParentItems(leaves, parent);
	}


	/**
	 * Build nodes of IDs recursively from the property keys.
	 *
	 * @param source The object describing the relations.
	 * @param include Optional predicate used for determining whether a property should be included as an ID.
	 * @returns The root nodes.
	 */
	public static fromPropertyIds(source: object, include?: (prop: string, val: any) => boolean): HCNode<string>[] {
		return childMapToNodes(ChildMap.fromPropertyIds(source, include));
	}
	//#endregion

	//#region Conversion/Mapping
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
		return nodesToChildMap(roots, identify, childMap);
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
		return nodesToDescendantMap(roots, identify, descendantMap);
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
		return nodesToAncestorMap(roots, identify, ancestorMap);
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
		return nodesToRelations(roots, identify);
	}
	//#endregion

	//#region Predicates (has*)
	/** Does a descendant node matching the `search` exist? */
	public static hasDescendant<Item>(
		roots: Some<HCNode<Item>>,
		search: NodePredicate<Item>,
		includeSelf = false, type: TraversalType = 'breadth-first',
	): boolean {
		return this.findDescendant(roots, search, includeSelf, type) !== undefined;
	}

	/** Does an ancestor node matching the `search` exist? */
	public static hasAncestor<Item>(
		roots: Some<HCNode<Item>>,
		search: NodePredicate<Item>,
		includeSelf = false,
	): boolean {
		return this.findAncestor(roots, search, includeSelf) !== undefined;
	}
	//#endregion

	//#region Retrieval (get*)
	/** Get descendant nodes by traversing according to the options. */
	public static getDescendants<Item>(
		roots: Some<HCNode<Item>>,
		includeSelf = false,
		type: TraversalType = 'breadth-first',
	): HCNode<Item>[] {
		return flattenGraph({
			roots: HCNode.getRoots(roots, includeSelf),
			next:  node => node.children,
			type,
		});
	}

	/** Get unique ancestor nodes. */
	public static getAncestors<Item>(
		nodes: Some<HCNode<Item>>,
		includeSelf = false,
	): HCNode<Item>[] {
		if (isSomeItem(nodes))
			return nodes.getAncestors(includeSelf);

		const seen = new Set<HCNode<Item>>();
		const ancestors: HCNode<Item>[] = [];

		for (const node of someToIterable(nodes)) {
			const first = includeSelf ? node : node.parent;
			if (!first || seen.has(first))
				continue;

			const unseenAncestors = flattenSequence({
				first,
				next: node => {
					const parent = node.parent;
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
	//#endregion

	//#region Search (find*)
	/** Find the first descendant node matching the `search`. */
	public static findDescendant<Item>(
		roots: Some<HCNode<Item>>,
		search: NodePredicate<Item>,
		includeSelf = false,
		type: TraversalType = 'breadth-first',
	): HCNode<Item> | undefined {
		return searchGraph({
			roots: HCNode.getRoots(roots, includeSelf),
			next:  node => node.children,
			search,
			type,
		});
	}

	/** Find the descendant nodes matching the `search`. */
	public static findDescendants<Item>(
		roots: Some<HCNode<Item>>,
		search: NodePredicate<Item>,
		includeSelf = false,
		type: TraversalType = 'breadth-first',
	): HCNode<Item>[] {
		return searchGraphMany({
			roots: HCNode.getRoots(roots, includeSelf),
			next:  node => node.children,
			search,
			type,
		});
	}

	/** Find the first ancestor node matching the `search`. */
	public static findAncestor<Item>(
		roots: Some<HCNode<Item>>,
		search: NodePredicate<Item>,
		includeSelf = false,
	): HCNode<Item> | undefined {
		if (isSomeItem(roots))
			return roots.findAncestor(search, includeSelf);

		const seen = new Set<HCNode<Item>>();

		for (const root of roots) {
			const first = includeSelf ? root : root.parent;
			if (!first || seen.has(first))
				continue;

			const found = searchSequence({
				first,
				next: node => {
					const parent = node.parent;
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
	public static findAncestors<Item>(
		roots: Some<HCNode<Item>>,
		search: NodePredicate<Item>,
		includeSelf = false,
	): HCNode<Item>[] {
		if (isSomeItem(roots))
			return roots.findAncestors(search, includeSelf);

		const seen = new Set<HCNode<Item>>();
		const ancestors: HCNode<Item>[] = [];

		for (const root of roots) {
			const first = includeSelf ? root : root.parent;
			if (!first || seen.has(first))
				continue;

			const found = searchSequenceMany({
				first,
				next: node => {
					const parent = node.parent;
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

	/** Find the common ancestor node which is the closest to the `nodes`. */
	public static findCommonAncestor<Item>(nodes: Some<HCNode<Item>>, includeSelf = false): HCNode<Item> | undefined {
		const commonAncestors = this.findCommonAncestorSet(nodes, includeSelf);

		return commonAncestors?.values().next().value;
	}

	/** Find the ancestor nodes common to the `nodes`. */
	public static findCommonAncestors<Item>(nodes: Some<HCNode<Item>>, includeSelf = false): HCNode<Item>[] | undefined {
		const commonAncestors = this.findCommonAncestorSet(nodes, includeSelf);

		return commonAncestors ? [ ...commonAncestors ] : undefined;
	}

	/** Find the set of ancestor nodes common to the `nodes`. */
	public static findCommonAncestorSet<Item>(nodes: Some<HCNode<Item>>, includeSelf = false): Set<HCNode<Item>> | undefined {
		const commonAncestors = someToArray(nodes).reduce((acc, curr) => {
			const ancestors = new Set(curr.getAncestors(includeSelf));

			return !acc ? ancestors : acc.intersection(ancestors);
		}, undefined as Set<HCNode<Item>> | undefined);

		return commonAncestors;
	}
	//#endregion

	//#region Traversal (traverse*)
	/** Generate a sequence of descendant nodes by traversing according to the options. */
	public static traverseDescendants<Item>(
		roots: Some<HCNode<Item>>,
		includeSelf = false,
		type: TraversalType = 'breadth-first',
	): Generator<HCNode<Item>, void, undefined> {
		return traverseGraph({
			roots: HCNode.getRoots(roots, includeSelf),
			next:  node => node.children,
			type,
		});
	}
	//#endregion

}

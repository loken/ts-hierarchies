import { type MapArgs, mapArgs, MultiMap, type Some, someToArray, someToIterable } from '@loken/utilities';

import type { HCNode } from '../nodes/node.js';
import type { DeBrand, NodePredicate } from '../nodes/node.types.js';
import { Nodes } from '../nodes/nodes.js';
import { ChildMap } from '../maps/child-map.js';
import type { Identify } from '../utilities/identify.js';
import type { Relation } from '../relations/relation.types.js';
import { Hierarchies } from './hierarchies.js';
import { nodesToChildMap, nodesToDescendantMap, nodesToAncestorMap, nodesToRelations } from '../nodes/nodes-to.js';
import type { TraversalType } from '../traversal/graph.types.js';


/** Contains the `id`, `item` and `node` for a `HCNode` in a `Hierarchy`. */
export type HierarchyEntry<Item, Id> = [id: Id, item: Item, node: HCNode<Item>];


/**
 * Keeps track of the a set of nodes and their roots
 * and provides structural modification.
 */
export class Hierarchy<Item, Id = Item> {

	/** Create a hierarchy using the provided `identify` function. */
	constructor(identify: Identify<Item, Id>) {
		this.#identify = identify;
	}

	//#region backing fields
	#roots = new Map<Id, HCNode<Item>>();
	#nodes = new Map<Id, HCNode<Item>>();
	#debrand = new Map<Id, DeBrand>();
	#identify: Identify<Item, Id>;
	//#endregion

	//#region accessors
	/** Get a shallow clone of the roots. */
	public get roots(): HCNode<Item>[] {
		return [ ...this.#roots.values() ];
	}

	/** Get a shallow clone of the root items. */
	public get rootItems(): Item[] {
		return this.roots.map(r => r.item);
	}

	/** Get a shallow clone of the root IDs. */
	public get rootIds(): Id[] {
		return this.roots.map(r => this.#identify(r.item));
	}

	/** Get a shallow clone of all nodes. */
	public get nodes(): HCNode<Item>[] {
		return [ ...this.#nodes.values() ];
	}

	/** Get a shallow clone of all node items. */
	public get nodeItems(): Item[] {
		return this.nodes.map(n => n.item);
	}

	/** Get a shallow clone of all node IDs. */
	public get nodeIds(): Id[] {
		return this.nodes.map(n => this.#identify(n.item));
	}

	/** Means of getting an ID for an `item`. */
	public get identify(): Identify<Item, Id> {
		return this.#identify;
	}


	/** Map the `ids` to a boolean signifying their presence. */
	public has<Ids extends Id[]>(...ids: Ids): MapArgs<Ids, boolean, true, false> {
		return mapArgs(ids, id => this.#nodes.has(id), true, false);
	}

	/** Is every `Id` in the `ids` present? */
	public hasEvery(ids: Some<Id>): boolean {
		for (const id of someToIterable(ids)) {
			if (!this.#nodes.has(id))
				return false;
		}

		return true;
	}

	/** Is some `Id` in the `ids` present? */
	public hasSome(ids: Some<Id>): boolean {
		for (const id of someToIterable(ids)) {
			if (this.#nodes.has(id))
				return true;
		}

		return false;
	}


	/**
	 * Get node or nodes by their `Id`.
	 * @param ids The IDs of nodes to retrieve.
	 * @returns A single node when you pass a single ID and a fixed length tuple of nodes when you pass multiple IDs.
	 * @throws Node with ID not found in hierarchy.
	 * @throws Must provide at least one argument.
	 */
	public get<Ids extends Id[]>(...ids: Ids): MapArgs<Ids, HCNode<Item>, true, false> {
		return mapArgs(ids, id => this.#get(id), true, false);
	}

	/**
	 * Get nodes by their `Id`s.
	 * @param ids The IDs of nodes to retrieve.
	 * @returns An array of nodes.
	 * @throws Node with ID not found in hierarchy.
	 */
	public getSome(ids: Some<Id>): HCNode<Item>[] {
		const nodes: HCNode<Item>[] = [];

		for (const id of someToIterable(ids)) {
			const node = this.#nodes.get(id);
			if (!node)
				throw new Error(`Node with ID '${ id }' not found in hierarchy. Use 'has()' to check existence before calling 'getSome()'.`);

			nodes.push(node);
		}

		return nodes;
	}

	/**
	 * Get item or items by `Id`.
	 * @param ids The IDs of items to retrieve.
	 * @throws Node with ID not found in hierarchy.
	 * @throws Must provide at least one argument.
	 * @returns A single item when you pass a single ID and a fixed length tuple of items when you pass multiple IDs.
	 */
	public getItems<Ids extends Id[]>(...ids: Ids): MapArgs<Ids, Item, true, false> {
		return mapArgs(ids, id => this.#get(id).item, true, false);
	}

	/**
	 * Get item or items by `Id`.
	 * @param ids The IDs of items to retrieve.
	 * @returns An array of items.
	 */
	public getSomeItems(ids: Some<Id>): Item[] {
		return this.getSome(ids).map(n => n.item);
	}

	#get(id: Id): HCNode<Item> {
		const node = this.#nodes.get(id);
		if (node === undefined)
			throw new Error(`Node with ID '${ id }' not found in hierarchy. Use 'has()' to check existence before calling 'get()'.`);

		return node;
	}

	/** Helper method to get existing nodes without throwing for missing IDs. */
	#getSomeExisting(ids: Some<Id>): HCNode<Item>[] {
		const nodes: HCNode<Item>[] = [];

		for (const id of someToIterable(ids)) {
			const node = this.#nodes.get(id);
			if (node)
				nodes.push(node);
		}

		return nodes;
	}
	//#endregion

	//#region links
	/**
	 * Attach the provided `roots`.
	 * @param roots Nodes to attach.
	 */
	public attachRoot(roots: Some<HCNode<Item>>): this {
		const nodes = someToArray(roots);

		if (!nodes.every(n => n.isRoot))
			throw new Error('Cannot attach non-root nodes as roots. All nodes must be roots (have no parent).');

		this.#addNodes(nodes, true);

		return this;
	}

	/**
	 * Attach the provided `children` to the node of the provided `parentId`.
	 * @param parentId The ID of the node to attach to.
	 * @param children Nodes to attach.
	 */
	public attach(parentId: Id, children: Some<HCNode<Item>>): this {
		if (!this.#nodes.has(parentId))
			throw new Error(`Parent node with ID '${ parentId }' not found in hierarchy. Use 'has()' to check existence before calling 'attach()'.`);

		this.#addNodes(children);

		const parent = this.#nodes.get(parentId)!;
		parent.attach(children);

		return this;
	}

	/**
	 * Detach the provided `nodes`.
	 * @param nodes Nodes to detach.
	 */
	public detach(nodes: Some<HCNode<Item>>): this {
		for (const node of Nodes.getDescendants(nodes, true)) {
			const id = this.#identify(node.item);
			this.#debrand.get(id)!();
			this.#debrand.delete(id);
			this.#nodes.delete(id);
			this.#roots.delete(id);
		}

		for (const node of someToIterable(nodes)) {
			if (!node.isRoot)
				node.detachSelf();
		}

		return this;
	}

	#addNodes(nodes: Some<HCNode<Item>>, asRoot = false): void {
		for (const node of Nodes.getDescendants(nodes, true)) {
			const id = this.#identify(node.item);
			this.#debrand.set(id, node.brand(this));
			this.#nodes.set(id, node);
		}

		if (!asRoot)
			return;

		for (const node of someToIterable(nodes))
			this.#roots.set(this.#identify(node.item), node);
	}
	//#endregion

	//#region traversal
	/**
	 * Get the chain of ancestor nodes starting with the nodes for the items matching the `ids`.
	 * @param ids The IDs of nodes to start traversal from.
	 * @param includeSelf Whether to include the starting nodes in the result.
	 * @returns An array of ancestor nodes in order from immediate parent to root.
	 */
	public getAncestors(ids: Some<Id>, includeSelf = false): HCNode<Item>[] {
		const nodes = this.getSome(ids);

		return nodes ? Nodes.getAncestors(nodes, includeSelf) : [];
	}

	/**
	 * Get the items from the chain of ancestor nodes starting with the nodes for the items matching the `ids`.
	 * @param ids The IDs of nodes to start traversal from.
	 * @param includeSelf Whether to include the starting nodes in the result.
	 * @returns An array of ancestor items in order from immediate parent to root.
	 */
	public getAncestorItems(ids: Some<Id>, includeSelf = false): Item[] {
		return this.getAncestors(ids, includeSelf).map(n => n.item);
	}

	/**
	 * Get the IDs from the chain of ancestor nodes starting with the nodes for the items matching the `ids`.
	 * @param ids The IDs of nodes to start traversal from.
	 * @param includeSelf Whether to include the starting nodes in the result.
	 * @returns An array of ancestor IDs in order from immediate parent to root.
	 */
	public getAncestorIds(ids: Some<Id>, includeSelf = false): Id[] {
		return this.getAncestors(ids, includeSelf).map(n => this.#identify(n.item));
	}

	/**
	 * Get the entries from the chain of ancestor nodes starting with the node for the item matching the `id`.
	 * @param id The ID of the node to start traversal from.
	 * @param includeSelf Whether to include the starting node in the result.
	 * @returns An array of ancestor entries in order from immediate parent to root.
	 */
	public getAncestorEntries(id: Id, includeSelf = false): HierarchyEntry<Item, Id>[] {
		return this.getAncestors(id, includeSelf).map(node => {
			return [ this.#identify(node.item), node.item, node ];
		});
	}


	/**
	 * Get the chain of descendant nodes starting with the nodes for the items matching the `ids`.
	 * @param ids The IDs of nodes to start traversal from.
	 * @param includeSelf Whether to include the starting nodes in the result.
	 * @returns An array of descendant nodes in breadth-first order.
	 */
	public getDescendants(ids: Some<Id>, includeSelf = false, type: TraversalType = 'breadth-first'): HCNode<Item>[] {
		const roots = this.getSome(ids);
		if (roots.length === 0)
			return [];

		return Nodes.getDescendants(roots, includeSelf, type);
	}

	/**
	 * Get the items from the chain of descendant nodes starting with the nodes for the items matching the `ids`.
	 * @param ids The IDs of nodes to start traversal from.
	 * @param includeSelf Whether to include the starting nodes in the result.
	 * @returns An array of descendant items in breadth-first order.
	 */
	public getDescendantItems(ids: Some<Id>, includeSelf = false, type: TraversalType = 'breadth-first'): Item[] {
		return this.getDescendants(ids, includeSelf, type).map(n => n.item);
	}

	/**
	 * Get the IDs from the chain of descendant nodes starting with the nodes for the items matching the `ids`.
	 * @param ids The IDs of nodes to start traversal from.
	 * @param includeSelf Whether to include the starting nodes in the result.
	 * @returns An array of descendant IDs in breadth-first order.
	 */
	public getDescendantIds(ids: Some<Id>, includeSelf = false, type: TraversalType = 'breadth-first'): Id[] {
		return this.getDescendants(ids, includeSelf, type).map(n => this.#identify(n.item));
	}

	/**
	 * Get the entries from the chain of descendant nodes starting with the nodes for the items matching the `ids`.
	 * @param ids The IDs of nodes to start traversal from.
	 * @param includeSelf Whether to include the starting nodes in the result.
	 * @returns An array of descendant entries in breadth-first order.
	 */
	public getDescendantEntries(ids: Some<Id>, includeSelf = false, type: TraversalType = 'breadth-first'): HierarchyEntry<Item, Id>[] {
		return this.getDescendants(ids, includeSelf, type).map(node => {
			return [ this.#identify(node.item), node.item, node ];
		});
	}

	/**
	 * Get the chain of descendant nodes starting with the hierarchy `roots`.
	 * @param includeSelf Whether to include the root nodes in the result.
	 * @returns An array of descendant nodes in breadth-first order.
	 */
	public getAllDescendants(includeSelf = false, type: TraversalType = 'breadth-first'): HCNode<Item>[] {
		return Nodes.getDescendants(this.roots, includeSelf, type);
	}

	/**
	 * Get the items from the chain of descendant nodes starting with the hierarchy `roots`.
	 * @param includeSelf Whether to include the root nodes in the result.
	 * @returns An array of descendant items in breadth-first order.
	 */
	public getAllDescendantItems(includeSelf = false, type: TraversalType = 'breadth-first'): Item[] {
		return Nodes.getDescendants(this.roots, includeSelf, type).map(n => n.item);
	}

	/**
	 * Get the IDs from the chain of descendant nodes starting with the hierarchy `roots`.
	 * @param includeSelf Whether to include the root nodes in the result.
	 * @returns An array of descendant IDs in breadth-first order.
	 */
	public getAllDescendantIds(includeSelf = false, type: TraversalType = 'breadth-first'): Id[] {
		return Nodes.getDescendants(this.roots, includeSelf, type).map(n => this.#identify(n.item));
	}

	/**
	 * Get the entries from the chain of descendant nodes starting with the hierarchy `roots`.
	 * @param includeSelf Whether to include the root nodes in the result.
	 * @returns An array of descendant entries in breadth-first order.
	 */
	public getAllDescendantEntries(includeSelf = false, type: TraversalType = 'breadth-first'): HierarchyEntry<Item, Id>[] {
		return Nodes.getDescendants(this.roots, includeSelf, type).map(node => {
			return [ this.#identify(node.item), node.item, node ];
		});
	}
	//#endregion

	//#region search
	/**
	 * Does a node with one of the `ids` have an ancestor node matching the `search`?
	 * @param ids The IDs of nodes to search from.
	 * @param search The search criteria - either IDs or a predicate function.
	 * @param includeSelf Whether to include the starting nodes in the search.
	 * @returns True if any ancestor matches the search criteria.
	 */
	public hasAncestor(ids: Some<Id>, search: Some<Id> | NodePredicate<Item>, includeSelf = false): boolean {
		const roots = this.getSome(ids);

		return Nodes.hasAncestor(roots, this.normalizeSearch(search), includeSelf);
	}

	/**
	 * Does a node with one of the `ids` have a descendant node matching the `search`?
	 * @param ids The IDs of nodes to search from.
	 * @param search The search criteria - either IDs or a predicate function.
	 * @param includeSelf Whether to include the starting nodes in the search.
	 * @returns True if any descendant matches the search criteria.
	 */
	public hasDescendant(ids: Some<Id>, search: Some<Id> | NodePredicate<Item>, includeSelf = false, type: TraversalType = 'breadth-first'): boolean {
		const roots = this.getSome(ids);

		return Nodes.hasDescendant(roots, this.normalizeSearch(search), includeSelf, type);
	}

	/**
	 * Find nodes matching a list of `Id`s or a `HCNode<Item>` predicate.
	 * @param search The search criteria - either IDs or a predicate function.
	 * @returns An array of matching nodes.
	 */
	public find(search: Some<Id> | NodePredicate<Item>): HCNode<Item>[] {
		return this.#findInternal(search, (_id, node) => node);
	}

	/**
	 * Find items matching a list of `Id`s or a `HCNode<Item>` predicate.
	 * @param search The search criteria - either IDs or a predicate function.
	 * @returns An array of matching items.
	 */
	public findItems(search: Some<Id> | NodePredicate<Item>): Item[] {
		return this.#findInternal(search, (_id, node) => node.item);
	}

	/**
	 * Find IDs matching a list of `Id`s or a `HCNode<Item>` predicate.
	 * @param search The search criteria - either IDs or a predicate function.
	 * @returns An array of matching IDs.
	 */
	public findIds(search: Some<Id> | NodePredicate<Item>): Id[] {
		return this.#findInternal(search, (id, node) => id ?? this.#identify(node.item));
	}

	/**
	 * Find entries matching a list of `Id`s or a `HCNode<Item>` predicate.
	 * @param search The search criteria - either IDs or a predicate function.
	 * @returns An array of matching entries (tuples of [id, item, node]).
	 */
	public findEntries(search: Some<Id> | NodePredicate<Item>): HierarchyEntry<Item, Id>[] {
		return this.#findInternal(search, (id, node) => [ id ?? this.#identify(node.item), node.item, node ]);
	}

	#findInternal<T>(
		search: Some<Id> | NodePredicate<Item>,
		project: (id: Id | undefined, node: HCNode<Item>) => T,
	): T[] {
		if (typeof search === 'function') {
			const result: T[] = [];
			for (const node of this.#nodes.values()) {
				if ((search as NodePredicate<Item>)(node))
					result.push(project(undefined, node));
			}

			return result;
		}
		else if (Array.isArray(search) || search instanceof Set) {
			const results: T[] = [];
			for (const id of search) {
				const node = this.#nodes.get(id);
				if (node)
					results.push(project(id, node));
			}

			return results;
		}
		else {
			const node = this.#nodes.get(search);
			if (node)
				return [ project(search, node) ];

			return [];
		}
	}


	/**
	 * Find a node matching the `search` which is an ancestor of a node with one of the `ids`.
	 */
	public findAncestor(ids: Some<Id>, search: Some<Id> | NodePredicate<Item>, includeSelf = false): HCNode<Item> | void {
		const roots = this.getSome(ids);

		return Nodes.findAncestor(roots, this.normalizeSearch(search), includeSelf);
	}

	/**
	 * Find an item matching the `search` which is an ancestor of a node with one of the `ids`.
	 */
	public findAncestorItem(ids: Some<Id>, search: Some<Id> | NodePredicate<Item>, includeSelf = false): Item | void {
		const ancestor = this.findAncestor(ids, search, includeSelf);

		return ancestor?.item;
	}

	/**
	 * Find an ID matching the `search` which is an ancestor of a node with one of the `ids`.
	 */
	public findAncestorId(ids: Some<Id>, search: Some<Id> | NodePredicate<Item>, includeSelf = false): Id | undefined {
		const ancestor = this.findAncestor(ids, search, includeSelf);

		return ancestor ? this.#identify(ancestor.item) : undefined;
	}

	/**
	 * Find an entry matching the `search` which is an ancestor of a node with one of the `ids`.
	 */
	public findAncestorEntry(ids: Some<Id>, search: Some<Id> | NodePredicate<Item>, includeSelf = false): HierarchyEntry<Item, Id> | undefined {
		const ancestor = this.findAncestor(ids, search, includeSelf);

		return ancestor ? [ this.#identify(ancestor.item), ancestor.item, ancestor ] : undefined;
	}

	/**
	 * Find nodes matching the `search` which are ancestors of a node with one of the `ids`.
	 */
	public findAncestors(ids: Some<Id>, search: Some<Id> | NodePredicate<Item>, includeSelf = false): HCNode<Item>[] {
		const roots = this.getSome(ids);

		return Nodes.findAncestors(roots, this.normalizeSearch(search), includeSelf);
	}

	/**
	 * Find items matching the `search` which are ancestors of a node with one of the `ids`.
	 */
	public findAncestorItems(ids: Some<Id>, search: Some<Id> | NodePredicate<Item>, includeSelf = false): Item[] {
		return this.findAncestors(ids, search, includeSelf).map(n => n.item);
	}

	/**
	 * Find IDs matching the `search` which are ancestors of a node with one of the `ids`.
	 */
	public findAncestorIds(ids: Some<Id>, search: Some<Id> | NodePredicate<Item>, includeSelf = false): Id[] {
		return this.findAncestors(ids, search, includeSelf).map(n => this.#identify(n.item));
	}

	/**
	 * Find entries matching the `search` which are ancestors of a node with one of the `ids`.
	 */
	public findAncestorEntries(ids: Some<Id>, search: Some<Id> | NodePredicate<Item>, includeSelf = false): HierarchyEntry<Item, Id>[] {
		return this.findAncestors(ids, search, includeSelf).map(node => {
			return [ this.#identify(node.item), node.item, node ];
		});
	}

	/**
	 * Find a node matching the `search` which is a descendant of a node with one of the `ids`.
	 */
	public findDescendant(ids: Some<Id>, search: Some<Id> | NodePredicate<Item>, includeSelf = false, type: TraversalType = 'breadth-first'): HCNode<Item> | void {
		const roots = this.getSome(ids);

		return Nodes.findDescendant(roots, this.normalizeSearch(search), includeSelf, type);
	}

	/**
	 * Find an item matching the `search` which is a descendant of a node with one of the `ids`.
	 */
	public findDescendantItem(ids: Some<Id>, search: Some<Id> | NodePredicate<Item>, includeSelf = false, type: TraversalType = 'breadth-first'): Item | undefined {
		const descendant = this.findDescendant(ids, search, includeSelf, type);

		return descendant?.item;
	}

	/**
	 * Find an ID matching the `search` which is a descendant of a node with one of the `ids`.
	 */
	public findDescendantId(ids: Some<Id>, search: Some<Id> | NodePredicate<Item>, includeSelf = false, type: TraversalType = 'breadth-first'): Id | undefined {
		const descendant = this.findDescendant(ids, search, includeSelf, type);

		return descendant ? this.#identify(descendant.item) : undefined;
	}

	/**
	 * Find an entry matching the `search` which is a descendant of a node with one of the `ids`.
	 */
	public findDescendantEntry(ids: Some<Id>, search: Some<Id> | NodePredicate<Item>, includeSelf = false, type: TraversalType = 'breadth-first'): HierarchyEntry<Item, Id> | undefined {
		const descendant = this.findDescendant(ids, search, includeSelf, type);

		return descendant ? [ this.#identify(descendant.item), descendant.item, descendant ] : undefined;
	}

	/**
	 * Find nodes matching the `search` which are descendants of a node with one of the `ids`.
	 */
	public findDescendants(ids: Some<Id>, search: Some<Id> | NodePredicate<Item>, includeSelf = false, type: TraversalType = 'breadth-first'): HCNode<Item>[] {
		const roots = this.getSome(ids);

		return Nodes.findDescendants(roots, this.normalizeSearch(search), includeSelf, type);
	}

	/**
	 * Find items matching the `search` which are descendants of a node with one of the `ids`.
	 */
	public findDescendantItems(ids: Some<Id>, search: Some<Id> | NodePredicate<Item>, includeSelf = false, type: TraversalType = 'breadth-first'): Item[] {
		return this.findDescendants(ids, search, includeSelf, type).map(n => n.item);
	}

	/**
	 * Find IDs matching the `search` which are descendants of a node with one of the `ids`.
	 */
	public findDescendantIds(ids: Some<Id>, search: Some<Id> | NodePredicate<Item>, includeSelf = false, type: TraversalType = 'breadth-first'): Id[] {
		return this.findDescendants(ids, search, includeSelf, type).map(n => this.#identify(n.item));
	}

	/**
	 * Find entries matching the `search` which are descendants of a node with one of the `ids`.
	 */
	public findDescendantEntries(ids: Some<Id>, search: Some<Id> | NodePredicate<Item>, includeSelf = false, type: TraversalType = 'breadth-first'): HierarchyEntry<Item, Id>[] {
		return this.findDescendants(ids, search, includeSelf, type).map(node => {
			return [ this.#identify(node.item), node.item, node ];
		});
	}


	/** Find the common ancestor node which is the closest to the `ids`. */
	public findCommonAncestor(ids: Some<Id>, includeSelf = false): HCNode<Item> | undefined {
		const nodes = this.getSome(ids);

		return Nodes.findCommonAncestor(nodes, includeSelf);
	}

	/** Find the item of the common ancestor node which is the closest to the `ids`. */
	public findCommonAncestorItem(ids: Some<Id>, includeSelf = false): Item | undefined {
		const commonAncestor = this.findCommonAncestor(ids, includeSelf);

		return commonAncestor?.item;
	}

	/** Find the ID of the common ancestor node which is the closest to the `ids`. */
	public findCommonAncestorId(ids: Some<Id>, includeSelf = false): Id | undefined {
		const commonAncestor = this.findCommonAncestor(ids, includeSelf);

		return commonAncestor ? this.#identify(commonAncestor.item) : undefined;
	}

	/** Find the ancestor nodes common to the `ids`. */
	public findCommonAncestors(ids: Some<Id>, includeSelf = false): HCNode<Item>[] | undefined {
		const nodes = this.getSome(ids);

		return Nodes.findCommonAncestors(nodes, includeSelf);
	}

	/** Find the items of ancestor nodes common to the `ids`. */
	public findCommonAncestorItems(ids: Some<Id>, includeSelf = false): Item[] | undefined {
		return this.findCommonAncestors(ids, includeSelf)?.map(n => n.item);
	}

	/** Find the IDs of ancestor nodes common to the `ids`. */
	public findCommonAncestorIds(ids: Some<Id>, includeSelf = false): Id[] | undefined {
		return this.findCommonAncestors(ids, includeSelf)?.map(n => this.#identify(n.item));
	}

	/** Find the entries of ancestor nodes common to the `ids`. */
	public findCommonAncestorEntries(ids: Some<Id>, includeSelf = false): HierarchyEntry<Item, Id>[] | undefined {
		return this.findCommonAncestors(ids, includeSelf)?.map(node => {
			return [ this.#identify(node.item), node.item, node ];
		});
	}

	/** Find the set of ancestor nodes common to the `ids`. */
	public findCommonAncestorSet(ids: Some<Id>, includeSelf = false): Set<HCNode<Item>> | undefined {
		const nodes = this.getSome(ids);

		return Nodes.findCommonAncestorSet(nodes, includeSelf);
	}


	/**
	 * Create a new `Hierarchy` from matching items.
	 *
	 * @param search A list of `Id`s or a `HCNode<Item>` predicate.
	 * @param include Optional facets to include: The nodes that are `matches`, their `ancestors` and/or their `descendants` in the result.
	 * - When not specified you are getting all three facets as a default.
	 * - When the options object is specified you must opt in to the facets you want and must enable at least one.
	 * @returns A new `Hierarchy<Item, Id>` with new nodes wrapping the same `Item`s as in the searched hierarchy pruned to fit the search and `include` facets.
	 * @throws If you provide `include` options but enable no facets.
	 */
	public search(
		search: Some<Id> | NodePredicate<Item>,
		include?: { matches?: boolean, ancestors?: boolean, descendants?: boolean },
	): Hierarchy<Item, Id> {
		include ??= {
			matches:     true,
			ancestors:   true,
			descendants: true,
		};

		if (!(include.matches || include.ancestors || include.descendants))
			throw new Error('At least one facet must be enabled in the include options: matches, ancestors, or descendants.');

		const childMap = new MultiMap<Id>();
		const items = new Map<Id, Item>();

		for (const [ id, item, node ] of this.findEntries(search)) {
			if (include.ancestors) {
				const ancestorIds: Id[] = [];
				for (const [ ancestorId, ancestorItem ] of this.getAncestorEntries(id, include.matches)) {
					ancestorIds.push(ancestorId);

					if (!items.has(ancestorId))
						items.set(ancestorId, ancestorItem);
				}

				ChildMap.addAncestors(ancestorIds, childMap);
			}

			if (include.descendants) {
				for (const [ descendantId, descendantItem, descendant ] of this.getDescendantEntries(id, include.matches)) {
					if (!items.has(descendantId)) {
						items.set(descendantId, descendantItem);

						if (descendant.isLeaf)
							childMap.addEmpty(descendantId);
					}

					if (!descendant.isLeaf) {
						for (const child of descendant.children) {
							const childItem = child.item;
							const childId = this.#identify(childItem);

							childMap.add(descendantId, childId);
							items.set(childId, childItem);
						}
					}
				}
			}

			if (include.matches && !include.ancestors && !include.descendants) {
				let addedToChildMap = false;
				if (!node.isRoot) {
					const parentId = this.#identify(node.parentItem!);

					if (items.has(parentId)) {
						childMap.add(parentId, id);
						addedToChildMap = true;
					}
				}

				if (!node.isLeaf) {
					const includedChildIds = node
						.childItems
						.map(this.#identify)
						.filter(id => items.has(id));

					if (includedChildIds.length) {
						childMap.add(id, includedChildIds);
						addedToChildMap = true;
					}
				}

				if (!addedToChildMap)
					childMap.addEmpty(id);

				items.set(id, item);
			}
		}

		return Hierarchies.fromChildMapWithItems([ ...items.values() ], this.#identify, childMap);
	}


	protected normalizeSearch(search: Some<Id> | NodePredicate<Item>): NodePredicate<Item> {
		if (typeof search === 'function')
			return search as NodePredicate<Item>;
		if (Array.isArray(search))
			return (node) => search.includes(this.#identify(node.item));
		else if (search instanceof Set)
			return (node) => search.has(this.#identify(node.item));
		else
			return (node) => this.#identify(node.item) === search;
	}
	//#endregion

	//#region Transform
	/**
	 * Create a clone of an existing item hierarchy with the same structure and items, but new node instances.
	 * This is a fast alternative to complex search operations for simple cloning scenarios.
	 *
	 * @template Item The type of item.
	 * @template Id The type of IDs.
	 * @param hierarchy The hierarchy to clone.
	 * @returns A new `Hierarchy<Item, Id>` with the same structure and items but new nodes.
	 */
	public clone(): Hierarchy<Item, Id> {
		const roots = Nodes.fromChildMapWithItems(
			this.nodeItems,
			this.identify,
			this.toChildMap(),
		);

		return new Hierarchy<Item, Id>(this.identify).attachRoot(roots);
	}

	/**
	 * Create a clone of an existing hierarchy with the same structure but new node instances for IDs.
	 *
	 * @template Item The type of item.
	 * @template Id The type of IDs.
	 * @param hierarchy The hierarchy to clone.
	 * @returns A new `Hierarchy<Id>` with the same structure but new nodes.
	 */
	public cloneIds(): Hierarchy<Id> {
		const roots = Nodes.fromChildMap(this.toChildMap());

		return Hierarchies.createForIds<Id>().attachRoot(roots);
	}

	/** Create a map of ids to child-ids by traversing the `hierarchy`. */
	public toChildMap(): MultiMap<Id> {
		return nodesToChildMap(this.roots, this.#identify);
	}

	/** Create a map of ids to descendant-ids by traversing the `hierarchy`. */
	public toDescendantMap(): MultiMap<Id> {
		return nodesToDescendantMap(this.roots, this.#identify);
	}

	/** Create a map of ids to ancestor-ids by traversing the `hierarchy`. */
	public toAncestorMap(): MultiMap<Id> {
		return nodesToAncestorMap(this.roots, this.#identify);
	}

	/** Create a list of relations by traversing the graph of the `hierarchy`. */
	public toRelations(): Relation<Id>[] {
		return nodesToRelations(this.roots, this.#identify);
	}
	//#endregion

}

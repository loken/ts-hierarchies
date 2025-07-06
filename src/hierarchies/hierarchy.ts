import { type MapArgs, mapArgs, MultiMap, type Some, someToArray, someToIterable } from '@loken/utilities';

import type { HCNode } from '../nodes/node.js';
import type { DeBrand, NodePredicate } from '../nodes/node.types.js';
import { nodesToIds, nodesToItems } from '../nodes/node-conversion.js';
import { Nodes } from '../nodes/nodes.js';
import { ChildMap } from '../utilities/child-map.js';
import type { Identify } from '../utilities/identify.js';
import type { Relation } from '../utilities/relations.js';
import { Hierarchies } from './hierarchies.js';


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
	 * @throws The 'id' must be a hierarchy member.
	 * @throws Must provide at least one argument.
	 */
	public get<Ids extends Id[]>(...ids: Ids): MapArgs<Ids, HCNode<Item>, true, false> {
		return mapArgs(ids, id => this.#get(id), true, false);
	}

	/**
	 * Get nodes by their `Id`s.
	 * @param ids The IDs of nodes to retrieve.
	 * @returns An array of nodes.
	 */
	public getSome(ids: Some<Id>): HCNode<Item>[] {
		const nodes: HCNode<Item>[] = [];

		for (const id of someToIterable(ids)) {
			const node = this.#nodes.get(id);
			if (node)
				nodes.push(node);
		}

		return nodes;
	}

	/**
	 * Get item or items by `Id`.
	 * @param ids The IDs of items to retrieve.
	 * @throws The 'id' must be a hierarchy member.
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
		return this.getSome(ids).map(node => node.item);
	}

	#get(id: Id) {
		const node = this.#nodes.get(id);
		if (node === undefined)
			throw new Error("The 'id' must be a hierarchy member.");

		return node;
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
			throw new Error("The 'roots' all be roots!");

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
			throw new Error("The 'parentId' must be a hierarchy member.");

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

	#addNodes(nodes: Some<HCNode<Item>>, asRoot = false) {
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
	 * Get the chain of ancestor nodes starting with the node for the item matching the `id`.
	 */
	public getAncestors(ids: Some<Id>, includeSelf = false): HCNode<Item>[] {
		const nodes = this.getSome(ids);

		return nodes ? Nodes.getAncestors(nodes, includeSelf) : [];
	}

	/**
	 * Get the items from the chain of ancestor nodes starting with the node for the item matching the `id`.
	 */
	public getAncestorItems(ids: Some<Id>, includeSelf = false): Item[] {
		return nodesToItems(this.getAncestors(ids, includeSelf));
	}

	/**
	 * Get the IDs from the chain of ancestor nodes starting with the node for the item matching the `id`.
	 */
	public getAncestorIds(ids: Some<Id>, includeSelf = false): Id[] {
		return nodesToIds(this.getAncestors(ids, includeSelf), this.#identify);
	}

	/**
	 * Get the entries from the chain of ancestor nodes starting with the node for the item matching the `id`.
	 */
	public getAncestorEntries(id: Id, includeSelf = false): HierarchyEntry<Item, Id>[] {
		return this.getAncestors(id, includeSelf).map(node => {
			return [ this.#identify(node.item), node.item, node ];
		});
	}


	/**
	 * Get the chain of descendant nodes starting with the nodes for the items matching the `ids`.
	 */
	public getDescendants(ids: Some<Id>, includeSelf = false): HCNode<Item>[] {
		const roots = this.getSome(ids);
		if (roots.length === 0)
			return [];

		return Nodes.getDescendants(roots, includeSelf);
	}

	/**
	 * Get the items from the chain of descendant nodes starting with the nodes for the items matching the `ids`.
	 */
	public getDescendantItems(ids: Some<Id>, includeSelf = false): Item[] {
		return nodesToItems(this.getDescendants(ids, includeSelf));
	}

	/**
	 * Get the IDs from the chain of descendant nodes starting with the nodes for the items matching the `ids`.
	 */
	public getDescendantIds(ids: Some<Id>, includeSelf = false): Id[] {
		return nodesToIds(this.getDescendants(ids, includeSelf), this.#identify);
	}

	/**
	 * Get the entries from the chain of descendant nodes starting with the nodes for the items matching the `ids`.
	 */
	public getDescendantEntries(ids: Some<Id>, includeSelf = false): HierarchyEntry<Item, Id>[] {
		return this.getDescendants(ids, includeSelf).map(node => {
			return [ this.#identify(node.item), node.item, node ];
		});
	}

	/**
	 * Get the chain of descendant nodes starting with the hierarchy `roots`.
	 */
	public getAllDescendants(includeSelf = false): HCNode<Item>[] {
		return Nodes.getDescendants(this.roots, includeSelf);
	}

	/**
	 * Get the items from the chain of descendant nodes starting with the hierarchy `roots`.
	 */
	public getAllDescendantItems(includeSelf = false): Item[] {
		return nodesToItems(Nodes.getDescendants(this.roots, includeSelf));
	}

	/**
	 * Get the IDs from the chain of descendant nodes starting with the hierarchy `roots`.
	 */
	public getAllDescendantIds(includeSelf = false): Id[] {
		return nodesToIds(Nodes.getDescendants(this.roots, includeSelf), this.#identify);
	}

	/**
	 * Get the entries from the chain of descendant nodes starting with the hierarchy `roots`.
	 */
	public getAllDescendantEntries(includeSelf = false): HierarchyEntry<Item, Id>[] {
		return Nodes.getDescendants(this.roots, includeSelf).map(node => {
			return [ this.#identify(node.item), node.item, node ];
		});
	}
	//#endregion

	//#region search
	/**
	 * Find nodes matching a list of `Id`s or a `HCNode<Item>` predicate.
	 */
	public find(search: Some<Id> | NodePredicate<Item>): HCNode<Item>[] {
		if (typeof search === 'function') {
			const result: HCNode<Item>[] = [];
			for (const node of this.#nodes.values()) {
				if ((search as NodePredicate<Item>)(node))
					result.push(node);
			}

			return result;
		}

		return this.getSome(search);
	}

	/**
	 * Find nodes matching a list of `Id`s or a `HCNode<Item>` predicate.
	 */
	public findItems(search: Some<Id> | NodePredicate<Item>): Item[] {
		return this.find(search).map(node => node.item);
	}

	/**
	 * Find `Id`s matching a list of `Id`s or a `HCNode<Item>` predicate.
	 */
	public findIds(search: Some<Id> | NodePredicate<Item>): Id[] {
		const result: Id[] = [];

		if (typeof search === 'function') {
			for (const [ id, node ] of this.#nodes) {
				if ((search as NodePredicate<Item>)(node))
					result.push(id);
			}
		}
		else {
			for (const id of someToIterable(search)) {
				if (this.#nodes.has(id))
					result.push(id);
			}
		}

		return result;
	}

	/**
	 * Find entries matching a list of `Id`s or a `HCNode<Item>` predicate.
	 */
	public findEntries(search: Some<Id> | NodePredicate<Item>): HierarchyEntry<Item, Id>[] {
		const result: HierarchyEntry<Item, Id>[] = [];

		if (typeof search === 'function') {
			for (const node of this.#nodes.values()) {
				if ((search as NodePredicate<Item>)(node))
					result.push([ this.#identify(node.item), node.item, node ]);
			}
		}
		else {
			for (const id of someToIterable(search)) {
				const node = this.#nodes.get(id);
				if (node)
					result.push([ id, node.item, node ]);
			}
		}

		return result;
	}


	/** Find the common ancestor node which is the closest to the `ids`. */
	public findCommonAncestor(ids: Some<Id>, includeSelf = false): HCNode<Item> | undefined {
		const nodes = this.getSome(ids);

		return Nodes.findCommonAncestor(nodes, includeSelf);
	}

	/** Find the ancestor nodes common to the `ids`. */
	public findCommonAncestors(ids: Some<Id>, includeSelf = false): HCNode<Item>[] | undefined {
		const nodes = this.getSome(ids);

		return Nodes.findCommonAncestors(nodes, includeSelf);
	}

	/**
	 * Find a node matching the `search` which is an ancestor of a node with one of the `ids`.
	 */
	public findAncestor(ids: Some<Id>, search: Some<Id> | NodePredicate<Item>, includeSelf = false): HCNode<Item> | undefined {
		const roots = this.getSome(ids);

		return Nodes.findAncestor(roots, this.normalizeSearch(search), includeSelf);
	}

	/**
	 * Find a node matching the `search` which is an ancestor of a node with one of the `ids`.
	 */
	public findAncestors(ids: Some<Id>, search: Some<Id> | NodePredicate<Item>, includeSelf = false): HCNode<Item>[] {
		const roots = this.getSome(ids);

		return Nodes.findAncestors(roots, this.normalizeSearch(search), includeSelf);
	}

	/**
	 * Find a node matching the `search` which is an descendant of a node with one of the `ids`.
	 */
	public findDescendant(ids: Some<Id>, search: Some<Id> | NodePredicate<Item>, includeSelf = false): HCNode<Item> | undefined {
		const roots = this.getSome(ids);

		return Nodes.findDescendant(roots, this.normalizeSearch(search), includeSelf);
	}

	/**
	 * Find nodes matching the `search` which are descendants of a node with one of the `ids`.
	 */
	public findDescendants(ids: Some<Id>, search: Some<Id> | NodePredicate<Item>, includeSelf = false): HCNode<Item>[] {
		const roots = this.getSome(ids);

		return Nodes.findDescendants(roots, this.normalizeSearch(search), includeSelf);
	}


	/**
	 * Does a node with one of the `ids` have an ancestor node matching the `search`?
	 */
	public hasAncestor(ids: Some<Id>, search: Some<Id> | NodePredicate<Item>, includeSelf = false): boolean {
		const roots = this.getSome(ids);

		return Nodes.hasAncestor(roots, this.normalizeSearch(search), includeSelf);
	}

	/**
	 * Does a node with one of the `ids` have a descendant node matching the `search`?
	 */
	public hasDescendant(ids: Some<Id>, search: Some<Id> | NodePredicate<Item>, includeSelf = false): boolean {
		const roots = this.getSome(ids);

		return Nodes.hasDescendant(roots, this.normalizeSearch(search), includeSelf);
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
			throw new Error("Must enable at least one facet to 'include'.");

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
				for (const [ descendantId, descendantItem, descendantNode ] of this.getDescendantEntries(id, include.matches)) {
					if (!items.has(descendantId)) {
						items.set(descendantId, descendantItem);

						if (descendantNode.isLeaf)
							childMap.addEmpty(descendantId);
					}

					if (!descendantNode.isLeaf) {
						for (const childNode of descendantNode.getChildren()) {
							const childItem = childNode.item;
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
					const parentId = this.#identify(node.getParentItem()!);

					if (items.has(parentId)) {
						childMap.add(parentId, id);
						addedToChildMap = true;
					}
				}

				if (!node.isLeaf) {
					const includedChildIds = node
						.getChildItems()
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

		return Hierarchies.createWithItems({
			items:    [ ...items.values() ],
			identify: this.#identify,
			spec:     childMap,
		});
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

	//#region MultiMaps
	/** Create a map of ids to child-ids by traversing the `hierarchy`. */
	public toChildMap(): MultiMap<Id> {
		return Nodes.toChildMap(this.roots, this.#identify);
	}

	/** Create a map of ids to descendant-ids by traversing the `hierarchy`. */
	public toDescendantMap(): MultiMap<Id> {
		return Nodes.toDescendantMap(this.roots, this.#identify);
	}

	/** Create a map of ids to ancestor-ids by traversing the `hierarchy`. */
	public toAncestorMap(): MultiMap<Id> {
		return Nodes.toAncestorMap(this.roots, this.#identify);
	}

	/** Create a list of relations by traversing the graph of the `hierarchy`. */
	public toRelations(): Relation<Id>[] {
		return Nodes.toRelations(this.roots, this.#identify);
	}
	//#endregion

}

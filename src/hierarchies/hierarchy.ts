import { mapArgs, MultiMap, type Some, someToArray, someToIterable } from '@loken/utilities';

import type { HCNode } from '../nodes/node.js';
import type { DeBrand, NodePredicate } from '../nodes/node.types.js';
import { nodesToIds } from '../nodes/node-conversion.js';
import { Nodes } from '../nodes/nodes.js';
import { flattenGraph } from '../traversal/traverse-graph.js';
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
	#roots = new Map<Id, HCNode<Item>>;
	#nodes = new Map<Id, HCNode<Item>>();
	#debrand = new Map<Id, DeBrand>();
	#identify: Identify<Item, Id>;
	//#endregion

	//#region accessors
	/** Get a shallow clone of the roots. */
	public get roots() {
		return [ ...this.#roots.values() ];
	}

	/** Get a shallow clone of the root items. */
	public get rootItems() {
		return this.roots.map(r => r.item);
	}

	/** Get a shallow clone of the root IDs. */
	public get rootIds() {
		return this.roots.map(r => this.#identify(r.item));
	}

	/** Get a shallow clone of all nodes. */
	public get nodes() {
		return [ ...this.#nodes.values() ];
	}

	/** Get a shallow clone of all node items. */
	public get nodeItems() {
		return this.nodes.map(n => n.item);
	}

	/** Get a shallow clone of all node IDs. */
	public get nodeIds() {
		return this.nodes.map(n => this.#identify(n.item));
	}

	/** Means of getting an ID for an `item`. */
	public get identify() {
		return this.#identify;
	}


	/** Map the `ids` to a boolean signifying their presence. */
	public has<Ids extends Id[]>(...ids: Ids) {
		return mapArgs(ids, id => this.#nodes.has(id), true, false);
	}

	/** Is every `Id` in the `ids` present? */
	public hasEvery(ids: Some<Id>) {
		for (const id of someToIterable(ids)) {
			if (!this.#nodes.has(id))
				return false;
		}

		return true;
	}

	/** Is some `Id` in the `ids` present? */
	public hasSome(ids: Some<Id>) {
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
	public get<Ids extends Id[]>(...ids: Ids) {
		return mapArgs(ids, id => this.#get(id), true, false);
	}

	/**
	 * Get nodes by their `Id`s.
	 * @param ids The IDs of nodes to retrieve.
	 * @returns An array of nodes.
	 * @throws The 'id' must be a hierarchy member.
	 */
	public getSome(ids: Some<Id>) {
		return someToArray(ids).map(id => this.#get(id));
	}

	/**
	 * Get item or items by `Id`.
	 * @param ids The IDs of items to retrieve.
	 * @throws The 'id' must be a hierarchy member.
	 * @throws Must provide at least one argument.
	 * @returns A single item when you pass a single ID and a fixed length tuple of items when you pass multiple IDs.
	 */
	public getItems<Ids extends Id[]>(...ids: Ids) {
		return mapArgs(ids, id => this.#get(id).item, true, false);
	}

	/**
	 * Get item or items by `Id`.
	 * @param ids The IDs of items to retrieve.
	 * @throws The 'id' must be a hierarchy member.
	 * @returns An array of items.
	 */
	public getSomeItems(ids: Some<Id>) {
		return someToArray(ids).map(id => this.#get(id).item);
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
	public detach(nodes: Some<HCNode<Item>>) {
		for (const node of flattenGraph({
			roots: nodes,
			next:  node => node.getChildren(),
		})) {
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
		for (const node of flattenGraph({
			roots: nodes,
			next:  node => node.getChildren(),
		})) {
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
	public getAncestors(id: Id, includeSelf = false) {
		return this.get(id).getAncestors(includeSelf);
	}

	/**
	 * Get the items from the chain of ancestor nodes starting with the node for the item matching the `id`.
	 */
	public getAncestorItems(id: Id, includeSelf = false) {
		return this.get(id).getAncestorItems(includeSelf);
	}

	/**
	 * Get the IDs from the chain of ancestor nodes starting with the node for the item matching the `id`.
	 */
	public getAncestorIds(id: Id, includeSelf = false) {
		return nodesToIds(this.get(id).getAncestors(includeSelf), this.#identify);
	}

	/**
	 * Get the entries from the chain of ancestor nodes starting with the node for the item matching the `id`.
	 */
	public getAncestorEntries(id: Id, includeSelf = false) {
		return this.getAncestors(id, includeSelf).map(node => {
			return [ this.#identify(node.item), node.item, node ] as HierarchyEntry<Item, Id>;
		});
	}


	/**
	 * Get the chain of descendant nodes starting with the nodes for the items matching the `ids`.
	 */
	public getDescendants(ids: Some<Id>, includeSelf = false) {
		return Nodes.getDescendants(this.getSome(ids), includeSelf);
	}

	/**
	 * Get the items from the chain of descendant nodes starting with the nodes for the items matching the `ids`.
	 */
	public getDescendantItems(ids: Some<Id>, includeSelf = false) {
		return Nodes.getDescendants(this.getSome(ids), includeSelf).map(node => node.item);
	}

	/**
	 * Get the IDs from the chain of descendant nodes starting with the nodes for the items matching the `ids`.
	 */
	public getDescendantIds(ids: Some<Id>, includeSelf = false) {
		return Nodes.getDescendants(this.getSome(ids), includeSelf).map(node => this.#identify(node.item));
	}

	/**
	 * Get the entries from the chain of descendant nodes starting with the nodes for the items matching the `ids`.
	 */
	public getDescendantEntries(ids: Some<Id>, includeSelf = false) {
		return this.getDescendants(ids, includeSelf).map(node => {
			return [ this.#identify(node.item), node.item, node ] as HierarchyEntry<Item, Id>;
		});
	}

	/**
	 * Get the chain of descendant nodes starting with the hierarchy `roots`.
	 */
	public getAllDescendants(includeSelf = false) {
		return Nodes.getDescendants(this.roots, includeSelf);
	}

	/**
	 * Get the items from the chain of descendant nodes starting with the hierarchy `roots`.
	 */
	public getAllDescendantItems(includeSelf = false) {
		return Nodes.getDescendants(this.roots, includeSelf).map(node => node.item);
	}

	/**
	 * Get the IDs from the chain of descendant nodes starting with the hierarchy `roots`.
	 */
	public getAllDescendantIds(includeSelf = false) {
		return nodesToIds(Nodes.getDescendants(this.roots, includeSelf), this.#identify);
	}

	/**
	 * Get the entries from the chain of descendant nodes starting with the hierarchy `roots`.
	 */
	public getAllDescendantEntries(includeSelf = false) {
		return Nodes.getDescendants(this.roots, includeSelf).map(node => {
			return [ this.#identify(node.item), node.item, node ] as HierarchyEntry<Item, Id>;
		});
	}
	//#endregion

	//#region search
	/**
	 * Find nodes matching a list of `Id`s or a `HCNode<Item>` predicate.
	 */
	public find(search: Id[] | NodePredicate<Item>) {
		const result: HCNode<Item>[] = [];

		if (Array.isArray(search)) {
			for (const id of search) {
				const node = this.#nodes.get(id);
				if (node)
					result.push(node);
			}
		}
		else {
			for (const node of this.#nodes.values()) {
				if (search(node))
					result.push(node);
			}
		}

		return result;
	}

	/**
	 * Find nodes matching a list of `Id`s or a `HCNode<Item>` predicate.
	 */
	public findItems(search: Id[] | NodePredicate<Item>) {
		return this.find(search).map(node => node.item);
	}

	/**
	 * Find `Id`s matching a list of `Id`s or a `HCNode<Item>` predicate.
	 */
	public findIds(search: Id[] | NodePredicate<Item>) {
		const result: Id[] = [];

		if (Array.isArray(search)) {
			for (const id of search) {
				if (this.#nodes.has(id))
					result.push(id);
			}
		}
		else {
			for (const [ id, node ] of this.#nodes) {
				if (search(node))
					result.push(id);
			}
		}

		return result;
	}

	/**
	 * Find entries matching a list of `Id`s or a `HCNode<Item>` predicate.
	 */
	public findEntries(search: Id[] | NodePredicate<Item>) {
		const result: HierarchyEntry<Item, Id>[] = [];

		if (Array.isArray(search)) {
			for (const id of search) {
				const node = this.#nodes.get(id);
				if (node)
					result.push([ id, node.item, node ]);
			}
		}
		else {
			for (const node of this.#nodes.values()) {
				if (search(node))
					result.push([ this.#identify(node.item), node.item, node ]);
			}
		}

		return result;
	}


	/**
	 * Find a node matching the `search` which is an ancestor of a node with one of the `ids`.
	 */
	public findAncestor(ids: Some<Id>, search: Id | Id[] | NodePredicate<Item>, includeSelf = false) {
		const roots = this.getSome(ids);

		return Nodes.findAncestor(roots, this.normalizeSearch(search), includeSelf);
	}

	/**
	 * Find a node matching the `search` which is an ancestor of a node with one of the `ids`.
	 */
	public findAncestors(ids: Some<Id>, search: Id | Id[] | NodePredicate<Item>, includeSelf = false) {
		const roots = this.getSome(ids);

		return Nodes.findAncestors(roots, this.normalizeSearch(search), includeSelf);
	}

	/**
	 * Find a node matching the `search` which is an descendant of a node with one of the `ids`.
	 */
	public findDescendant(ids: Some<Id>, search: Id | Id[]| NodePredicate<Item>, includeSelf = false) {
		const roots = this.getSome(ids);

		return Nodes.findDescendant(roots, this.normalizeSearch(search), includeSelf);
	}

	/**
	 * Find nodes matching the `search` which are descendants of a node with one of the `ids`.
	 */
	public findDescendants(ids: Some<Id>, search: Id | Id[] | NodePredicate<Item>, includeSelf = false) {
		const roots = this.getSome(ids);

		return Nodes.findDescendants(roots, this.normalizeSearch(search), includeSelf);
	}


	/**
	 * Does a node with one of the `ids` have an ancestor node matching the `search`?
	 */
	public hasAncestor(ids: Some<Id>, search: Id | Id[] | NodePredicate<Item>, includeSelf = false) {
		const roots = this.getSome(ids);

		return Nodes.hasAncestor(roots, this.normalizeSearch(search), includeSelf);
	}

	/**
	 * Does a node with one of the `ids` have a descendant node matching the `search`?
	 */
	public hasDescendant(ids: Some<Id>, search: Id | Id[] | NodePredicate<Item>, includeSelf = false) {
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
		search: Id[] | NodePredicate<Item>,
		include?: {matches?: boolean, ancestors?: boolean, descendants?: boolean},
	) {
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
							childMap.getOrAdd(descendantId);
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
					childMap.getOrAdd(id);

				items.set(id, item);
			}
		}

		return Hierarchies.createWithItems({
			items:    [ ...items.values() ],
			identify: this.#identify,
			spec:     childMap,
		});
	}


	protected normalizeSearch(search: Id | Id[] | NodePredicate<Item>): NodePredicate<Item> {
		if (typeof search === 'function')
			return search as NodePredicate<Item>;
		if (Array.isArray(search))
			return (node) => search.includes(this.#identify(node.item));
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
		return Nodes.toDescendantMap(this.roots, this.#identify);
	}

	/** Create a list of relations by traversing the graph of the `hierarchy`. */
	public toRelations(): Relation<Id>[] {
		return Nodes.toRelations(this.roots, this.#identify);
	}
	//#endregion

}

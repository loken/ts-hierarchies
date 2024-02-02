import { iterateMultiple, mapArgs, MultiMap, type Multiple, spreadMultiple } from '@loken/utilities';

import type { HCNode } from '../nodes/node.js';
import type { DeBrand, NodePredicate } from '../nodes/node.types.js';
import { nodesToIds } from '../nodes/node-conversion.js';
import { Nodes } from '../nodes/nodes.js';
import { traverseGraph } from '../traversal/traverse-graph.js';
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

	/** Get a shallow clone of all nodes. */
	public get nodes() {
		return [ ...this.#nodes.values() ];
	}

	/** Means of getting an ID for an `item`. */
	public get identify() {
		return this.#identify;
	}


	/** Map the `ids` to a boolean signifying their presence. */
	public hasMap<Ids extends Id[]>(...ids: Ids) {
		return mapArgs(ids, id => this.#nodes.has(id), true, false);
	}

	/** Is the `id` present? */
	public has(id: Id) {
		return this.#nodes.has(id);
	}

	/** Is every `Id` in the `ids` present? */
	public hasEvery(ids: Multiple<Id>) {
		for (const id of iterateMultiple(ids)) {
			if (!this.#nodes.has(id))
				return false;
		}

		return true;
	}

	/** Is some `Id` in the `ids` present? */
	public hasSome(ids: Multiple<Id>) {
		for (const id of iterateMultiple(ids)) {
			if (this.#nodes.has(id))
				return true;
		}

		return false;
	}


	/**
	 * Get node or nodes by their `Id`.
	 * @param id The ID of the node or first node to retrieve.
	 * @param ids The IDs of the nodes to retrieve beyond the first.
	 * @returns A single node when you pass a single ID and a fixed length tuple of nodes when you pass multiple IDs.
	 * @throws The 'id' must be a hierarchy member.
	 * @throws Must provide at least one argument.
	 */
	public get<Ids extends Id[]>(...ids: Ids) {
		return mapArgs(ids, id => this.#get(id), true, false);
	}

	/**
	 * Get item  or items by `Id`.
	 * @param id The ID of the item or first item to retrieve.
	 * @param ids The IDs of the items to retrieve beyond the first.
	 * @throws The 'id' must be a hierarchy member.
	 * @returns A single item when you pass a single ID and a fixed length tuple of items when you pass multiple IDs.
	 */
	public getItems<Ids extends Id[]>(...ids: Ids) {
		return mapArgs(ids, id => this.#get(id).item, true, false);
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
	public attachRoot(roots: Multiple<HCNode<Item>>): this {
		const nodes = spreadMultiple(roots);

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
	public attach(parentId: Id, children: Multiple<HCNode<Item>>): this {
		const nodes = spreadMultiple(children);

		if (!this.#nodes.has(parentId))
			throw new Error("The 'parentId' must be a hierarchy member.");

		this.#addNodes(nodes);

		const parent = this.#nodes.get(parentId)!;
		parent.attach(nodes);

		return this;
	}

	/**
	 * Detach the provided `nodes`.
	 * @param nodes Nodes to detach.
	 */
	public detach(node: Multiple<HCNode<Item>>) {
		const nodes = spreadMultiple(node);

		for (const node of traverseGraph({
			roots: nodes,
			next:  node => node.getChildren(),
		})) {
			const id = this.#identify(node.item);
			this.#debrand.get(id)!();
			this.#debrand.delete(id);
			this.#nodes.delete(id);
			this.#roots.delete(id);
		}

		for (const node of nodes) {
			if (!node.isRoot)
				node.detachSelf();
		}

		return this;
	}

	#addNodes(node: Multiple<HCNode<Item>>, asRoot = false) {
		const nodes = spreadMultiple(node);

		for (const node of traverseGraph({
			roots: nodes,
			next:  node => node.getChildren(),
		})) {
			const id = this.#identify(node.item);
			this.#debrand.set(id, node.brand(this));
			this.#nodes.set(id, node);
		}

		if (!asRoot)
			return;

		for (const node of nodes)
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
		return nodesToIds(this.get(id).traverseAncestors(includeSelf), this.#identify);
	}

	/**
	 * Get the entries from the chain of ancestor nodes starting with the node for the item matching the `id`.
	 */
	public getAncestorEntries(id: Id, includeSelf = false) {
		return [ ...this.traverseAncestorEntries(id, includeSelf) ];
	}

	/**
	 * Traverse the entries from the chain of ancestor nodes starting with the node for the item matching the `id`.
	 */
	public *traverseAncestorEntries(id: Id, includeSelf = false) {
		for (const node of this.get(id).traverseAncestors(includeSelf))
			yield [ this.#identify(node.item), node.item, node ] as HierarchyEntry<Item, Id>;
	}


	/**
	 * Get the chain of descendant nodes starting with the nodes for the items matching the `ids`.
	 */
	public getDescendants(ids: Multiple<Id>, includeSelf = false) {
		return Nodes.getDescendants(this.get(...spreadMultiple(ids)), includeSelf);
	}

	/**
	 * Get the items from the chain of descendant nodes starting with the nodes for the items matching the `ids`.
	 */
	public getDescendantItems(ids: Multiple<Id>, includeSelf = false) {
		return Nodes.getDescendantItems(this.get(...spreadMultiple(ids)), includeSelf);
	}

	/**
	 * Get the IDs from the chain of descendant nodes starting with the nodes for the items matching the `ids`.
	 */
	public getDescendantIds(ids: Multiple<Id>, includeSelf = false) {
		return nodesToIds(Nodes.traverseDescendants(this.get(...spreadMultiple(ids)), includeSelf), this.#identify);
	}

	/**
	 * Get the entries from the chain of descendant nodes starting with the nodes for the items matching the `ids`.
	 */
	public getDescendantEntries(ids: Multiple<Id>, includeSelf = false) {
		return [ ...this.traverseDescendantEntries(ids, includeSelf) ];
	}

	/**
	 * Traverse the entries from the chain of descendant nodes starting with the nodes for the items matching the `ids`.
	 */
	public *traverseDescendantEntries(ids: Multiple<Id>, includeSelf = false) {
		for (const node of Nodes.traverseDescendants(this.get(...spreadMultiple(ids)), includeSelf))
			yield [ this.#identify(node.item), node.item, node ] as HierarchyEntry<Item, Id>;
	}


	/**
	 * Get the chain of descendant nodes starting with the hierarchy `roots`.
	 */
	public getAllDescendants(includeSelf = false) {
		return Nodes.getDescendants(this.#roots.values(), includeSelf);
	}

	/**
	 * Get the items from the chain of descendant nodes starting with the hierarchy `roots`.
	 */
	public getAllDescendantItems(includeSelf = false) {
		return Nodes.getDescendantItems(this.#roots.values(), includeSelf);
	}

	/**
	 * Get the IDs from the chain of descendant nodes starting with the hierarchy `roots`.
	 */
	public getAllDescendantIds(includeSelf = false) {
		return nodesToIds(Nodes.traverseDescendants(this.#roots.values(), includeSelf), this.#identify);
	}

	/**
	 * Get the entries from the chain of descendant nodes starting with the hierarchy `roots`.
	 */
	public getAllDescendantEntries(includeSelf = false) {
		return [ ...this.traverseAllDescendantEntries(includeSelf) ];
	}

	/**
	 * Traverse the entries from the chain of descendant nodes starting with the hierarchy `roots`.
	 */
	public *traverseAllDescendantEntries(includeSelf = false) {
		for (const node of Nodes.traverseDescendants(this.#roots.values(), includeSelf))
			yield [ this.#identify(node.item), node.item, node ] as HierarchyEntry<Item, Id>;
	}
	//#endregion

	//#region search
	/**
	 * Find nodes matching a list of `Id`s or a `HCNode<Item>` predicate.
	 */
	public *find(search: Id[] | NodePredicate<Item>) {
		if (Array.isArray(search)) {
			for (const id of search) {
				const node = this.#nodes.get(id);
				if (node)
					yield node;
			}
		}
		else {
			for (const node of this.#nodes.values()) {
				if (search(node))
					yield node;
			}
		}
	}

	/**
	 * Find nodes matching a list of `Id`s or a `HCNode<Item>` predicate.
	 */
	public *findItems(search: Id[] | NodePredicate<Item>) {
		for (const node of this.find(search))
			yield node.item;
	}

	/**
	 * Find `Id`s matching a list of `Id`s or a `HCNode<Item>` predicate.
	 */
	public *findIds(search: Id[] | NodePredicate<Item>) {
		if (Array.isArray(search)) {
			for (const id of search) {
				if (this.#nodes.has(id))
					yield id;
			}
		}
		else {
			for (const [ id, node ] of this.#nodes) {
				if (search(node))
					yield id;
			}
		}
	}

	/**
	 * Find entries matching a list of `Id`s or a `HCNode<Item>` predicate.
	 */
	public *findEntries(search: Id[] | NodePredicate<Item>) {
		if (Array.isArray(search)) {
			for (const id of search) {
				const node = this.#nodes.get(id);
				if (node)
					yield [ id, node.item, node ] as HierarchyEntry<Item, Id>;
			}
		}
		else {
			for (const node of this.#nodes.values()) {
				if (search(node))
					yield [ this.#identify(node.item), node.item, node ] as HierarchyEntry<Item, Id>;
			}
		}
	}


	/**
	 * Find a node matching the `search` which is an ancestor of a node with one of the `ids`.
	 */
	public findAncestor(ids: Multiple<Id>, search: Id | Id[] | NodePredicate<Item>, includeSelf = false) {
		const roots = this.get(...spreadMultiple(ids));

		return Nodes.findAncestor(roots, this.normalizeSearch(search), includeSelf);
	}

	/**
	 * Find a node matching the `search` which is an descendant of a node with one of the `ids`.
	 */
	public findDescendant(ids: Multiple<Id>, search: Id | Id[]| NodePredicate<Item>, includeSelf = false) {
		const roots = this.get(...spreadMultiple(ids));

		return Nodes.findDescendant(roots, this.normalizeSearch(search), includeSelf);
	}

	/**
	 * Find nodes matching the `search` which are descendants of a node with one of the `ids`.
	 */
	public findDescendants(ids: Multiple<Id>, search: Id | Id[] | NodePredicate<Item>, includeSelf = false) {
		const roots = this.get(...spreadMultiple(ids));

		return Nodes.findDescendants(roots, this.normalizeSearch(search), includeSelf);
	}


	/**
	 * Does a node with one of the `ids` have an ancestor node matching the `search`?
	 */
	public hasAncestor(ids: Multiple<Id>, search: Id | Id[] | NodePredicate<Item>, includeSelf = false) {
		const roots = this.get(...spreadMultiple(ids));

		return Nodes.hasAncestor(roots, this.normalizeSearch(search), includeSelf);
	}

	/**
	 * Does a node with one of the `ids` have a descendant node matching the `search`?
	 */
	public hasDescendant(ids: Multiple<Id>, search: Id | Id[] | NodePredicate<Item>, includeSelf = false) {
		const roots = this.get(...spreadMultiple(ids));

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
				for (const [ ancestorId, ancestorItem ] of this.traverseAncestorEntries(id, include.matches)) {
					ancestorIds.push(ancestorId);

					if (!items.has(ancestorId))
						items.set(ancestorId, ancestorItem);
				}

				ChildMap.addAncestors(ancestorIds, childMap);
			}

			if (include.descendants) {
				for (const [ descendantId, descendantItem, descendantNode ] of this.traverseDescendantEntries(id, include.matches)) {
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
			items:    items.values(),
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
		return Nodes.toChildMap(this.#roots.values(), this.#identify);
	}

	/** Create a map of ids to descendant-ids by traversing the `hierarchy`. */
	public toDescendantMap(): MultiMap<Id> {
		return Nodes.toDescendantMap(this.#roots.values(), this.#identify);
	}

	/** Create a map of ids to ancestor-ids by traversing the `hierarchy`. */
	public toAncestorMap(): MultiMap<Id> {
		return Nodes.toDescendantMap(this.#roots.values(), this.#identify);
	}

	/** Create a list of relations by traversing the graph of the `hierarchy`. */
	public toRelations(): Relation<Id>[] {
		return Nodes.toRelations(this.#roots.values(), this.#identify);
	}
	//#endregion

}

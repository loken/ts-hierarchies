import { iterateMultiple, mapArgs, MultiMap, type Multiple, spreadMultiple } from '@loken/utilities';

import type { HCNode } from '../nodes/node.js';
import type { DeBrand, NodePredicate } from '../nodes/node.types.js';
import { nodesToIds } from '../nodes/node-conversion.js';
import { Nodes } from '../nodes/nodes.js';
import { traverseGraph } from '../traversal/traverse-graph.js';
import type { Identify } from '../utilities/identify.js';
import type { Relation } from '../utilities/relations.js';


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

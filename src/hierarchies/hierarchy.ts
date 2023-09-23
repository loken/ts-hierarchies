import { MultiMap, type Multiple, spreadMultiple } from '@loken/utilities';

import type { DeBrand, HCNode } from '../nodes/node.js';
import { nodesToIds } from '../nodes/node-conversion.js';
import { Nodes } from '../nodes/nodes.js';
import { traverseGraph } from '../traversal/traverse-graph.js';
import type { Identify } from '../utilities/identify.js';
import type { Relation } from '../utilities/relations.js';
import type { TransformTuple } from '../utilities/tuple.types.js';


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

	/**
	 * Get node or nodes by their `Id`.
	 * @param id The ID of the node or first node to retrieve.
	 * @param ids The IDs of the nodes to retrieve beyond the first.
	 * @throws The 'id' must be a hierarchy member.
	 * @returns A single node when you pass a single ID and an array of nodes when you pass multiple IDs.
	 */
	public get<Ids extends Id[]>(id: Id, ...ids: Ids): Ids['length'] extends 0 ? HCNode<Item> : TransformTuple<[Id, ...Ids], HCNode<Item>> {
		if (ids.length === 0)
			return this.getOne(id) as any;
		else
			return [ this.getOne(id), ...ids.map(id => this.getOne(id)) ] as any;
	}

	/**
	 * Get item  or items by `Id`.
	 * @param id The ID of the item or first item to retrieve.
	 * @param ids The IDs of the items to retrieve beyond the first.
	 * @throws The 'id' must be a hierarchy member.
	 * @returns A single item when you pass a single ID and an array of items when you pass multiple IDs.
	 */
	public getItem<Ids extends Id[]>(id: Id, ...ids: Ids): Ids['length'] extends 0 ? Item : TransformTuple<[Id, ...Ids], Item> {
		if (ids.length === 0)
			return this.getOne(id).item as any;
		else
			return [ this.getOne(id).item, ...ids.map(id => this.getOne(id).item) ] as any;
	}

	private getOne(id: Id) {
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
	 * Get the chain of descendant nodes starting with the node for the item matching the `id`.
	 */
	public getDescendants(id: Id, includeSelf = false) {
		return this.get(id).getDescendants(includeSelf);
	}

	/**
	 * Get the items from the chain of descendant nodes starting with the node for the item matching the `id`.
	 */
	public getDescendantItems(id: Id, includeSelf = false) {
		return this.get(id).getDescendantItems(includeSelf);
	}

	/**
	 * Get the IDs from the chain of descendant nodes starting with the node for the item matching the `id`.
	 */
	public getDescendantIds(id: Id, includeSelf = false) {
		return nodesToIds(this.get(id).traverseDescendants(includeSelf), this.#identify);
	}
	//#endregion

	//#region MultiMaps
	/** Create a map of ids to child-ids by traversing the `hierarchy`. */
	public toChildMap(): MultiMap<Id> {
		return Nodes.toChildMap(this.roots, this.identify);
	}

	/** Create a map of ids to descendant-ids by traversing the `hierarchy`. */
	public toDescendantMap(): MultiMap<Id> {
		return Nodes.toDescendantMap(this.roots, this.identify);
	}

	/** Create a map of ids to ancestor-ids by traversing the `hierarchy`. */
	public toAncestorMap(): MultiMap<Id> {
		return Nodes.toDescendantMap(this.roots, this.identify);
	}

	/** Create a list of relations by traversing the graph of the `hierarchy`. */
	public toRelations(): Relation<Id>[] {
		return Nodes.toRelations(this.roots, this.identify);
	}
	//#endregion

}

import { type Multiple, spreadMultiple } from '@loken/utilities';

import { type DeBrand, Node } from '../nodes/node.js';
import { type Identify, nodesToIds, nodesToItems } from '../nodes/node-conversion.js';
import { traverseGraph } from '../traversal/traverse-graph.js';
import { type TraverseSelf } from '../traversal/traverse-types.js';


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
	#identify: Identify<Item, Id>;
	#roots = new Map<Id, Node<Item>>;
	#nodes = new Map<Id, Node<Item>>();
	#debrand = new Map<Id, DeBrand>();
	//#endregion

	//#region accessors
	/** Means of getting an ID for an `item`. */
	public get identify() {
		return this.#identify;
	}

	/** Get a shallow clone of the roots. */
	public get roots() {
		return [ ...this.#roots.values() ];
	}

	/** Get a shallow clone of all nodes. */
	public get nodes() {
		return [ ...this.#nodes.values() ];
	}

	/**
	 * Get node by `id`.
	 * @param id The ID of the node to retrieve.
	 * @throws The 'id' must be a hierarchy member.
	 */
	public getNode(id: Id): Node<Item> {
		const node = this.#nodes.get(id);
		if (node === undefined)
			throw new Error("The 'id' must be a hierarchy member.");

		return node;
	}

	/**
	 * Get item by `id`.
	 * @param id The ID of the item to retrieve.
	 * @throws The 'id' must be a hierarchy member.
	 */
	public get(id: Id): Item {
		return this.getNode(id).item;
	}
	//#endregion

	//#region links
	/**
	 * Attach the provided `roots`.
	 * @param roots Nodes to attach.
	 */
	public attachRoot(roots: Multiple<Node<Item>>): this {
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
	public attach(parentId: Id, children: Multiple<Node<Item>>): this {
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
	public detach(node: Multiple<Node<Item>>) {
		const nodes = spreadMultiple(node);

		for (const node of traverseGraph({
			roots: nodes,
			next:  node => node.children,
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

	#addNodes(node: Multiple<Node<Item>>, asRoot = false) {
		const nodes = spreadMultiple(node);

		for (const node of traverseGraph({
			roots: nodes,
			next:  node => node.children,
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
	public getAncestorNodes(options: {id: Id} & TraverseSelf) {
		return this.getNode(options.id).getAncestors(options);
	}

	/**
	 * Get the items from the chain of ancestor nodes starting with the node for the item matching the `id`.
	 */
	public getAncestors(options: {id: Id} & TraverseSelf) {
		return nodesToItems(this.getNode(options.id).traverseAncestors(options));
	}

	/**
	 * Get the IDs from the chain of ancestor nodes starting with the node for the item matching the `id`.
	 */
	public getAncestorIds(options: {id: Id} & TraverseSelf) {
		return nodesToIds(this.getNode(options.id).traverseAncestors(options), this.#identify);
	}

	/**
	 * Get the chain of descendant nodes starting with the node for the item matching the `id`.
	 */
	public getDescendantNodes(options: {id: Id} & TraverseSelf) {
		return this.getNode(options.id).getDescendants(options);
	}

	/**
	 * Get the items from the chain of descendant nodes starting with the node for the item matching the `id`.
	 */
	public getDescendants(options: {id: Id} & TraverseSelf) {
		return nodesToItems(this.getNode(options.id).traverseDescendants(options));
	}

	/**
	 * Get the IDs from the chain of descendant nodes starting with the node for the item matching the `id`.
	 */
	public getDescendantIds(options: {id: Id} & TraverseSelf) {
		return nodesToIds(this.getNode(options.id).traverseDescendants(options), this.#identify);
	}
	//#endregion

}

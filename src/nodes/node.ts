import { isSomeItem, type Some, someToArray } from '@loken/utilities';

import { traverseGraphNext } from '../traversal/graph-traverse.js';
import { traverseSequence } from '../traversal/sequence-traverse.js';
import type { TraversalType } from '../traversal/graph.types.js';
import type { DeBrand, NodePredicate } from './node.types.js';
import { nodesToItems } from './node-conversion.js';
import { flattenGraph } from '../traversal/graph-flatten.js';
import { flattenSequence } from '../traversal/sequence-flatten.js';
import { searchSequence, searchSequenceMany } from '../traversal/sequence-search.js';
import { searchGraph, searchGraphMany } from '../traversal/graph-search.js';


/**
 * Wrapper for an `Item` participating in a double-linked graph.
 *
 * By using a wrapper rather than require specific properties on the type parameter
 * we don't need to make any assumptions about the wrapped type.
 */
export class HCNode<Item> {

	/** Create a node wrapping the `item`. */
	constructor(item: Item) {
		this.#item = item;
	}

	//#region backing fields
	#item:      Item;
	#parent?:   HCNode<Item>;
	#children?: Set<HCNode<Item>>;

	/** The brand is used to lock the node to a specific owner. */
	#brand?: any;
	//#endregion

	//#region predicates
	/** A node is a "root" when there is no `parent`. */
	public get isRoot() {
		return this.#parent === undefined;
	}

	/** A node is a "leaf" when there are no `children`. */
	public get isLeaf() {
		return this.#children === undefined || this.#children.size === 0;
	}

	/** A node is "internal" when it has `children`, meaning it's either "internal" or a "leaf". */
	public get isInternal() {
		return !this.isLeaf;
	}

	/**
	 * A node is "linked" when it is neither a root nor a child.
	 *
	 * A node is "linked" when it has a parent or at least one child.
	 */
	public get isLinked() {
		return !this.isRoot || !this.isLeaf;
	}

	/** Having a brand means that some other entity "owns" the node. */
	public get isBranded(): boolean {
		return this.#brand !== undefined;
	}
	//#endregion

	//#region brands
	/**
	 * When the brands of two nodes are compatible, they may be linked/attached
	 * in a parent-child relationship.
	 */
	public isBrandCompatible(other: HCNode<Item>): boolean {
		if (this.#brand === undefined)
			return other.#brand === undefined;
		else if (other.#brand === undefined)
			return false;
		else
			return this.#brand === other.#brand;
	}

	/**
	 * Adds the provided `brand` to the node,
	 * providing an `DeBrand` delegate for removing/clearing the brand.
	 */
	public brand(brand: any): DeBrand {
		if (brand === undefined)
			throw new Error("The brand cannot be 'undefined'.");

		if (this.#brand !== undefined)
			throw new Error("Must clear existing brand using the 'DeBrand' delegate before you can re-brand a node.");

		this.#brand = brand;

		return () => this.#brand = undefined;
	}
	//#endregion

	//#region links
	/**
	 * Attach the provided `children`.
	 */
	public attach(children: Some<HCNode<Item>>): this {
		const nodes = someToArray(children);

		if (nodes.length === 0)
			throw new Error("Must provide one or more 'children'.");

		if (!nodes.every(node => node.isRoot))
			throw new Error("Must all be without a 'parent' before attaching to another.");

		if (!nodes.every(node => node.isBrandCompatible(this)))
			throw new Error('Must all have a compatible brand.');

		this.#children ??= new Set<HCNode<Item>>();

		for (const child of nodes) {
			this.#children.add(child);
			child.#parent = this;
		}

		return this;
	}

	/** Detach the provided `children`. */
	public detach(children: Some<HCNode<Item>>): this {
		const nodes = someToArray(children);

		if (nodes.length === 0)
			throw new Error("Must provide one or more 'children'.");

		if (this.isLeaf || !nodes.every(child => this.#children!.has(child)))
			throw new Error("Must all be 'children'.");

		if (nodes.some(child => child.isBranded))
			throw new Error("Must clear brand using the 'DeBrand' delegate before you can detach a branded node.");

		for (const node of nodes) {
			this.#children!.delete(node);
			node.#parent = undefined;
		}

		if (this.isLeaf)
			this.#children = undefined;

		return this;
	}

	/** Detach the node from it's `parent`. */
	public detachSelf(): this {
		if (this.isRoot)
			throw new Error("Can't detach a root node as there's nothing to detach it from.");

		if (this.isBranded)
			throw new Error("Must clear brand using the 'DeBrand' delegate before you can detach a branded node.");

		if (this.#parent!.isLeaf || !this.#parent!.#children!.has(this))
			throw new Error('Invalid object state: It should not be possible for the node not to be a child of its parent!.');

		this.#parent!.#children!.delete(this);

		if (this.#parent!.isLeaf)
			this.#parent!.#children = undefined;

		this.#parent = undefined;

		return this;
	}

	/**
	 * Dismantling a node means to cascade detach it.
	 * We always cascade detach the nodes.
	 * We may also cascade up the ancestry, in which case the node is detached,
	 * and then the parent is dismantled, leading to the whole linked structure
	 * ending up unlinked.
	 * @param includeAncestry
	 * Should we cascade through the ancestry (true) or only cascade through the nodes (false)?
	 * No default value is because the caller should always make an active choice.
	 */
	public dismantle(includeAncestry: boolean): this {
		if (!this.isRoot && includeAncestry) {
			const parent = this.#parent!;
			this.detachSelf();
			parent.dismantle(true);
		}

		for (const descendant of this.getDescendants(false))
			descendant.detachSelf();

		return this;
	}
	//#endregion

	//#region accessors
	/** The item is the subject/content of the node. */
	public get item() {
		return this.#item;
	}

	/** Get the parent node, if any. */
	public get parent() {
		return this.#parent;
	}

	/** Get the parent item, if any. */
	public get parentItem() {
		return this.#parent?.item;
	}

	/** Get all child nodes. */
	public get children() {
		return this.#children ? [ ...this.#children ] : [];
	}

	/** Get all child items. */
	public get childItems() {
		return this.#children ? nodesToItems(this.#children.values()) : [];
	}

	/** Get ancestor nodes by traversing according to the options. */
	public getAncestors(includeSelf = false) {
		return flattenSequence({
			first: includeSelf ? this : this.#parent,
			next:  node => node?.parent,
		});
	}

	/** Get ancestor items by traversing according to the options. */
	public getAncestorItems(includeSelf = false) {
		return this.getAncestors(includeSelf).map(node => node.item);
	}

	/** Get descendant nodes by traversing according to the options. */
	public getDescendants(includeSelf = false, type: TraversalType = 'breadth-first') {
		return flattenGraph({
			roots: this.#getRoots(includeSelf),
			next:  node => node.#children,
			type,
		});
	}

	/** Get descendant items by traversing according to the options. */
	public getDescendantItems(includeSelf = false, type: TraversalType = 'breadth-first') {
		return this.getDescendants(includeSelf, type).map(node => node.item);
	}


	/** Find the first ancestor node matching the `search`. */
	public findAncestor(search: NodePredicate<Item>, includeSelf = false) {
		return searchSequence({
			first: includeSelf ? this : this.#parent,
			next:  node => node.parent,
			search,
		});
	}

	/** Find the ancestor nodes matching the `search`. */
	public findAncestors(search: NodePredicate<Item>, includeSelf = false) {
		return searchSequenceMany({
			first: includeSelf ? this : this.#parent,
			next:  node => node.parent,
			search,
		});
	}

	/** Find the first descendant node matching the `search`. */
	public findDescendant(search: NodePredicate<Item>, includeSelf = false, type: TraversalType = 'breadth-first') {
		return  searchGraph({
			roots: this.#getRoots(includeSelf),
			next:  node => node.#children,
			search,
			type,
		});
	}

	/** Find the descendant nodes matching the `search`. */
	public findDescendants(search: NodePredicate<Item>, includeSelf = false, type: TraversalType = 'breadth-first') {
		return  searchGraphMany({
			roots: this.#getRoots(includeSelf),
			next:  node => node.#children,
			search,
			type,
		});
	}


	/** Does an ancestor node matching the `search` exist? */
	public hasAncestor(search: NodePredicate<Item>, includeSelf = false) {
		return this.findAncestor(search, includeSelf) !== undefined;
	}

	/** Does a descendant node matching the `search` exist? */
	public hasDescendant(search: NodePredicate<Item>, includeSelf = false, type: TraversalType = 'breadth-first') {
		return this.findDescendant(search, includeSelf, type) !== undefined;
	}
	//#endregion

	//#region traversal
	/** Generate a sequence of ancestor nodes by traversing according to the options. */
	public traverseAncestors(includeSelf = false) {
		return traverseSequence({
			first: includeSelf ? this : this.#parent,
			next:  node => node?.parent,
		});
	}

	/** Generate a sequence of descendant nodes by traversing according to the options. */
	public traverseDescendants(includeSelf = false, type: TraversalType = 'breadth-first') {
		return traverseGraphNext({
			roots: this.#getRoots(includeSelf),
			next:  node => node.#children,
			type,
		});
	}
	//#endregion

	//#region helpers
	/**
	 * Get nodes to use as roots.
	 *
	 * Note: This must be a private method as it could otherwise be exploited to modify the `#children`.
	 */
	#getRoots(includeSelf = false): Some<HCNode<Item>> {
		return includeSelf ? this : (this.#children ?? []);
	}

	/**
	 * Get nodes to use as roots.
	 */
	public static getRoots<Item>(roots: Some<HCNode<Item>>, includeSelf = false): Some<HCNode<Item>> {
		if (includeSelf)
			return roots;

		if (isSomeItem(roots))
			return roots.#children ? [ ...roots.#children ] : [];

		const children: HCNode<Item>[] = [];
		for (const root of roots) {
			if (root.#children)
				children.push(...root.#children);
		}

		return children;
	}
	//#endregion

}

import { type Some, someToArray } from '@loken/utilities';

import { traverseGraphNext } from '../traversal/graph-traverse.js';
import { traverseSequence } from '../traversal/sequence-traverse.js';
import { type Ascend, type Descend, normalizeDescend } from '../traversal/traversal-options.js';
import type { DeBrand, NodePredicate } from './node.types.js';
import { flattenGraphNext } from '../traversal/graph-flatten.js';
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
	#item:        Item;
	#parent?:     HCNode<Item>;
	#children?:   Set<HCNode<Item>>;
	#childCache?: readonly HCNode<Item>[];

	/** The brand is used to lock the node to a specific owner. */
	#brand?: any;
	//#endregion

	//#region predicates
	/** A node is a "root" when there is no `parent`. */
	public get isRoot(): boolean {
		return this.#parent === undefined;
	}

	/** A node is a "leaf" when there are no `children`. */
	public get isLeaf(): boolean {
		return this.#children === undefined || this.#children.size === 0;
	}

	/** A node is "internal" when it has `children`, meaning it's either "internal" or a "leaf". */
	public get isInternal(): boolean {
		return !this.isLeaf;
	}

	/**
	 * A node is "linked" when it has a parent or at least one child,
	 * which means it's not both a root and a leaf.
	 */
	public get isLinked(): boolean {
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

		this.#childCache = undefined;

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

		this.#childCache = undefined;

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

		this.#parent!.#childCache = undefined;
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

		for (const descendant of this.getDescendants())
			descendant.detachSelf();

		return this;
	}
	//#endregion

	//#region accessors
	/** The item is the subject/content of the node. */
	public get item(): Item {
		return this.#item;
	}

	/** Get the parent node, if any. */
	public get parent(): HCNode<Item> | undefined {
		return this.#parent;
	}

	/** Get the parent item, if any. */
	public get parentItem(): Item | undefined {
		return this.#parent?.item;
	}

	/**
	 * Get all child nodes.
	 *
	 * @remarks
	 * The returned array is frozen and must not be mutated. Do not push, pop, or modify its contents.
	 * This is for performance and security: always treat the result as immutable.
	 */
	public get children(): HCNode<Item>[] {
		if (!this.#childCache) {
			const arr = this.#children ? Array.from(this.#children) : [];
			this.#childCache = Object.freeze(arr);
		}

		return this.#childCache as HCNode<Item>[];
	}

	/** Get all child items. */
	public get childItems(): Item[] {
		return this.#children ? Array.from(this.#children, node => node.item) : [];
	}

	/** Get ancestor nodes by traversing according to the options. */
	public getAncestors(ascend?: Ascend): HCNode<Item>[] {
		return flattenSequence({
			first: ascend === 'with-self' ? this : this.#parent,
			next:  node => node?.parent,
		});
	}

	/** Get ancestor items by traversing according to the options. */
	public getAncestorItems(ascend?: Ascend): Item[] {
		return this.getAncestors(ascend).map(node => node.item);
	}

	/** Get descendant nodes by traversing according to the options. */
	public getDescendants(descend?: Descend): HCNode<Item>[] {
		return flattenGraphNext({
			roots:   this as HCNode<Item>,
			next:    node => node.#children,
			descend: normalizeDescend(descend, { includeSelf: false }),
		});
	}

	/** Get descendant items by traversing according to the options. */
	public getDescendantItems(descend?: Descend): Item[] {
		return this.getDescendants(descend).map(node => node.item);
	}


	/** Find the first ancestor node matching the `search`. */
	public findAncestor(search: NodePredicate<Item>, ascend?: Ascend): HCNode<Item> | void {
		return searchSequence({
			first: ascend === 'with-self' ? this : this.#parent,
			next:  node => node.parent,
			search,
		});
	}

	/** Find the ancestor nodes matching the `search`. */
	public findAncestors(search: NodePredicate<Item>, ascend?: Ascend): HCNode<Item>[] {
		return searchSequenceMany({
			first: ascend === 'with-self' ? this : this.#parent,
			next:  node => node.parent,
			search,
		});
	}

	/** Find the first descendant node matching the `search`. */
	public findDescendant(search: NodePredicate<Item>, descend?: Descend): HCNode<Item> | void {
		return  searchGraph({
			roots:   this as HCNode<Item>,
			next:    node => node.#children,
			search,
			descend: descend,
		});
	}

	/** Find the descendant nodes matching the `search`. */
	public findDescendants(search: NodePredicate<Item>, descend?: Descend): HCNode<Item>[] {
		return  searchGraphMany({
			roots:   this as HCNode<Item>,
			next:    node => node.#children,
			search,
			descend: descend,
		});
	}


	/** Does an ancestor node matching the `search` exist? */
	public hasAncestor(search: NodePredicate<Item>, ascend?: Ascend): boolean {
		return this.findAncestor(search, ascend) !== undefined;
	}

	/** Does a descendant node matching the `search` exist? */
	public hasDescendant(search: NodePredicate<Item>, descend?: Descend): boolean {
		return this.findDescendant(search, descend) !== undefined;
	}
	//#endregion

	//#region traversal
	/** Generate a sequence of ancestor nodes by traversing according to the options. */
	public traverseAncestors(ascend?: Ascend): Generator<HCNode<Item>> {
		return traverseSequence({
			first: ascend === 'with-self' ? this : this.#parent,
			next:  node => node?.parent,
		});
	}

	/** Generate a sequence of descendant nodes by traversing according to the options. */
	public traverseDescendants(descend?: Descend): Generator<HCNode<Item>> {
		return traverseGraphNext({
			roots:   this as HCNode<Item>,
			next:    node => node.#children,
			descend: descend,
		});
	}
	//#endregion

}

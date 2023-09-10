import { MultiMap, type Multiple, spreadMultiple } from '@loken/utilities';

import { type Identify, type IdentifyOptional } from '../nodes/node-conversion.js';
import { Nodes } from '../nodes/nodes.js';
import { type Relation, Relations } from '../nodes/relations.js';
import type { HierarchyIdSpec, HierarchyItemSpec } from './hierarchies.types.js';
import { Hierarchy } from './hierarchy.js';


/**
 * Convenience functions for creating and mapping `Hierarchy` instances.
 */
export class Hierarchies {

	/** Create a hierarchy of `Id`s. */
	public static createForIds<Id>(): Hierarchy<Id> {
		return new Hierarchy<Id>(id => id);
	}

	/** Create a hierarchy of `Item`s using the provided identify function. */
	public static createForItems<Item, Id>(identify: Identify<Item, Id>): Hierarchy<Item, Id> {
		return new Hierarchy<Item, Id>(identify);
	}

	/**
	 * Create a hierarchy of `Id`s matching the `spec`.
	 *
	 * @param spec Specification of how to create an `Id` hierarchy from a list of relations, a multi-map of `Id`s or a hierarchy.
	 */
	public static createWithIds<Id>(spec: HierarchyIdSpec<Id>): Hierarchy<Id> {
		const childMap = Hierarchies.idSpecToChildMap(spec);
		const roots = Nodes.assembleIds(childMap);

		return Hierarchies.createForIds<Id>().attachRoot(roots);
	}

	/**
	 * Create a hierarchy of `Item`s matching the `spec`.
	 *
	 * @template Item The type of item.
	 * @template Id The type of IDs.
	 * @param items The items to wrap in nodes.
	 * @param identify Means of getting an ID for an item.
	 * @param spec Specification of how to create an `Item` hierarchy from a list of relations, a multi-map of `Id`s,
 	 *             a hierarchy or a function which identifies the optional parent of an item.
	 * @returns The fully linked `Hierarchy<Item, Id>`.
	 */
	public static createWithItems<Item, Id>(items: Multiple<Item>, identify: Identify<Item, Id>, spec: HierarchyItemSpec<Item, Id>): Hierarchy<Item, Id> {
		items = spreadMultiple(items);

		const childMap = typeof spec === 'function'
			? Hierarchies.parentedItemsToChildMap(items, identify, spec)
			: Hierarchies.idSpecToChildMap(spec);

		const roots = Nodes.assembleItems(items, identify, childMap);

		return new Hierarchy<Item, Id>(identify).attachRoot(roots);
	}


	/** Create a map of ids to child-ids by traversing the `hierarchy`. */
	public static toChildMap<Item, Id>(hierarchy: Hierarchy<Item, Id>): MultiMap<Id> {
		return Nodes.toChildMap(hierarchy.roots, hierarchy.identify);
	}

	/** Create a map of ids to descendant-ids by traversing the `hierarchy`. */
	public static toDescendantMap<Item, Id>(hierarchy: Hierarchy<Item, Id>): MultiMap<Id> {
		return Nodes.toDescendantMap(hierarchy.roots, hierarchy.identify);
	}

	/** Create a map of ids to ancestor-ids by traversing the `hierarchy`. */
	public static toAncestorMap<Item, Id>(hierarchy: Hierarchy<Item, Id>): MultiMap<Id> {
		return Nodes.toDescendantMap(hierarchy.roots, hierarchy.identify);
	}

	/** Create a list of relations by traversing the graph of the `hierarchy`. */
	public static toRelations<Item, Id>(hierarchy: Hierarchy<Item, Id>): Relation<Id>[] {
		return Nodes.toRelations(hierarchy.roots, hierarchy.identify);
	}


	private static idSpecToChildMap<Id>(spec: HierarchyIdSpec<Id>): MultiMap<Id> {
		if (spec instanceof MultiMap)
			return spec;
		if (Array.isArray(spec))
			return Relations.toChildMap(spec);
		else
			return Hierarchies.toChildMap(spec);
	}

	private static parentedItemsToChildMap<Item, Id>(
		items: Item[],
		identify: Identify<Item, Id>,
		identifyParent: IdentifyOptional<Item, Id>,
	) {
		const map = new MultiMap<Id>();

		for (const item of items) {
			const parent = identifyParent(item);
			if (parent !== undefined)
				map.add(parent, identify(item));
		}

		return map;
	}

}

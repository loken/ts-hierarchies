import { MultiMap, spreadMultiple } from '@loken/utilities';

import { type Identify } from '../nodes/node-conversion.js';
import { Nodes } from '../nodes/nodes.js';
import { type Relation, Relations } from '../nodes/relations.js';
import type { CreateOptions, HierarchyIdSpec, HierarchyItemSpec, ParentedOptions } from './hierarchies.types.js';
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
	 * Create a hierarchy of `Id`s matching the `spec`.
	 *
	 * @param spec Specification of how to create an `Item` hierarchy from `items`, an `identify` function and either an ID `spec` or an `identifyParent` function.
	 */
	public static createWithItems<Item, Id>(options: HierarchyItemSpec<Item, Id>): Hierarchy<Item, Id> {
		const items = spreadMultiple(options.items);

		const childMap = options.spec
			? Hierarchies.idSpecToChildMap(options.spec)
			: Hierarchies.parentedItemsToChildMap(items, options);

		const roots = Nodes.assembleItems({
			identify: options.identify,
			items:    items,
			childMap,
		});

		return new Hierarchy<Item, Id>(options.identify).attachRoot(roots);
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
		options: CreateOptions<Item, Id> & ParentedOptions<Item, Id>,
	) {
		const map = new MultiMap<Id>();

		for (const item of items) {
			const parent = options.identifyParent(item);
			if (parent !== undefined)
				map.add(parent, options.identify(item));
		}

		return map;
	}

}

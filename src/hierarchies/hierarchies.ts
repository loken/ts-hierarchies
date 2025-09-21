import type { MultiMap, Some } from '@loken/utilities';

import { Nodes } from '../nodes/nodes.js';
import { ChildMap } from '../maps/child-map.js';
import type { Identify } from '../utilities/identify.js';
import type { GetChildren, GetParent, IdentifyChildren, IdentifyParent } from '../utilities/related-items.js';
import type { Relation } from '../relations/relation.types.js';
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

	/** Create a hierarchy of `Id`s from a child map. */
	public static fromChildMap<Id>(childMap: MultiMap<Id>): Hierarchy<Id> {
		const roots = Nodes.fromChildMap(childMap);

		return Hierarchies.createForIds<Id>().attachRoot(roots);
	}

	/** Create a hierarchy of `Item`s from a child map. */
	public static fromChildMapWithItems<Item, Id>(items: Some<Item>, identify: Identify<Item, Id>, childMap: MultiMap<Id>): Hierarchy<Item, Id> {
		const roots = Nodes.fromChildMapWithItems(items, identify, childMap);

		return Hierarchies.createForItems<Item, Id>(identify).attachRoot(roots);
	}

	/** Create a hierarchy of `Id`s from relations. */
	public static fromRelations<Id>(relations: Some<Relation<Id>>): Hierarchy<Id> {
		const roots = Nodes.fromRelations(relations);

		return Hierarchies.createForIds<Id>().attachRoot(roots);
	}

	/** Create a hierarchy of `Item`s from relations. */
	public static fromRelationsWithItems<Item, Id>(items: Some<Item>, identify: Identify<Item, Id>, relations: Some<Relation<Id>>): Hierarchy<Item, Id> {
		const childMap = ChildMap.fromRelations(relations);
		const roots = Nodes.fromChildMapWithItems(items, identify, childMap);

		return Hierarchies.createForItems<Item, Id>(identify).attachRoot(roots);
	}

	/** Create a hierarchy of `Id`s from an existing hierarchy. */
	public static fromHierarchy<Id, Other>(other: Hierarchy<Other, Id>): Hierarchy<Id> {
		const childMap = ChildMap.fromHierarchy(other);
		const roots = Nodes.fromChildMap(childMap);

		return Hierarchies.createForIds<Id>().attachRoot(roots);
	}

	/** Create a hierarchy of `Item`s matching another hierarchy. */
	public static fromHierarchyWithItems<Item, Id, Other>(
		items: Some<Item>,
		identify: Identify<Item, Id>,
		other: Hierarchy<Other, Id>,
	): Hierarchy<Item, Id> {
		const childMap = ChildMap.fromHierarchy(other);
		const roots = Nodes.fromChildMapWithItems(items, identify, childMap);

		return Hierarchies.createForItems<Item, Id>(identify).attachRoot(roots);
	}

	/** Create a hierarchy of `Item`s using an identifyChildren delegate for child IDs. */
	public static fromChildIds<Item, Id>(
		items: Some<Item>,
		identify: Identify<Item, Id>,
		identifyChildren: IdentifyChildren<Item, Id>,
	): Hierarchy<Item, Id> {
		const map = ChildMap.fromChildIds(items, identify, identifyChildren);
		const roots = Nodes.fromChildMapWithItems(items, identify, map);

		return Hierarchies.createForItems<Item, Id>(identify).attachRoot(roots);
	}

	/** Create a hierarchy of `Item`s from root items using a children delegate. */
	public static fromChildItems<Item, Id>(
		roots: Some<Item>,
		identify: Identify<Item, Id>,
		children: GetChildren<Item>,
	): Hierarchy<Item, Id> {
		const rootNodes = Nodes.fromChildItems(roots, children);

		return Hierarchies.createForItems<Item, Id>(identify).attachRoot(rootNodes);
	}

	/** Create a hierarchy of `Item`s using an identifyParent delegate for parent IDs. */
	public static fromParentIds<Item, Id>(
		items: Some<Item>,
		identify: Identify<Item, Id>,
		identifyParent: IdentifyParent<Item, Id>,
	): Hierarchy<Item, Id> {
		const map = ChildMap.fromParentIds(items, identify, identifyParent);
		const roots = Nodes.fromChildMapWithItems(items, identify, map);

		return Hierarchies.createForItems<Item, Id>(identify).attachRoot(roots);
	}

	/** Create a hierarchy of `Item`s from leaf items using a parent delegate. */
	public static fromParentItems<Item, Id>(
		leaves: Some<Item>,
		identify: Identify<Item, Id>,
		parent: GetParent<Item>,
	): Hierarchy<Item, Id> {
		const rootNodes = Nodes.fromParentItems(leaves, parent);

		return Hierarchies.createForItems<Item, Id>(identify).attachRoot(rootNodes);
	}

	/** Create a hierarchy of `Id`s from nested property keys. */
	public static fromPropertyIds(
		source: object,
		include?: (prop: string, val: any) => boolean,
	): Hierarchy<string> {
		const roots = Nodes.fromPropertyIds(source, include);

		return Hierarchies.createForIds<string>().attachRoot(roots);
	}

}

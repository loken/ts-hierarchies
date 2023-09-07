import type { MultiMap, Multiple } from '@loken/utilities';

import type { Identify, IdentifyOptional } from '../nodes/node-conversion.js';
import type { Relation } from '../nodes/relations.js';
import type { Hierarchy } from './hierarchy.js';


/** Specification of how to create an `Id` hierarchy from a list of relations, a multi-map of `Id`s or a hierarchy. */
export type HierarchyIdSpec<Id> = Relation<Id>[] | MultiMap<Id> | Hierarchy<any, Id>;

/** Specification of how to create an `Item` hierarchy from `items`, an `identify` function and either an ID `spec` or an `identifyParent` function. */
export type HierarchyItemSpec<Item, Id> = CreateOptions<Item, Id> & (SpecOptions<Id> | ParentedOptions<Item, Id>);

/** @internalexport */
export interface CreateOptions<Item, Id> {
	/** Means of getting an `Id` for an `Item`. */
	identify: Identify<Item, Id>,
	/** One or more `Item` instances */
	items: Multiple<Item>,
}

/** @internalexport */
export interface SpecOptions<Id> {
	/** Specification of how to create an `Id` hierarchy from a list of relations, a multi-map of `Id`s or a hierarchy. */
	spec: HierarchyIdSpec<Id>,
	identifyParent?: never,
}

/** @internalexport */
export interface ParentedOptions<Item, Id> {
	/** Means of getting an optional `Id` for an items parent. */
	identifyParent: IdentifyOptional<Item, Id>,
	spec?: never,
}

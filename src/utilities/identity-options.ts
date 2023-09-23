import type { MultiMap, Multiple } from '@loken/utilities';

import type { Hierarchy } from '../hierarchies/hierarchy.js';
import type { Identify } from './identify.js';
import type { GetChildren, GetParent, IdentifyChildren, IdentifyParent } from './related-items.js';
import type { Relation } from './relations.js';


/** Specification of how `Id`s relate to one another in a parent-to-child, one-to-many relationship. */
export type IdSpec<Id> = Relation<Id>[] | MultiMap<Id> | Hierarchy<any, Id>;

/**
 * Specification of how `Item`s relate to one another in a parent-to-child, one-to-many relationship
 * using getters and identifier functions on the `Item`s.
 *
 * This is a discriminated union of five different approaches:
 * - Use an ID spec: `spec`
 * - Read child items: `children` & `identify`
 * - Read child IDs: `childIds`
 * - Read parent items: `parent` & `identify`
 * - Read parent IDs: `parentId`
 */
export type ItemIdOptions<Item, Id> = IdsFromItems<Item, Id> & (
	| IdsFromSpec<Id>
	| IdsFromChildren<Item, Id>
	| IdsFromChildIds<Item, Id>
	| IdsFromParents<Item, Id>
	| IdsFromParentIds<Item, Id>
);


/** Specification for identifying `Id`s from `Item`s. */
export type IdsFromItems<Item, Id> = {items: Multiple<Item>, identify: Identify<Item, Id>};


/** Specification of `Id` relations from an `IdSpec`. */
export type IdsFromSpec<Id> = {
	spec:      IdSpec<Id>;

	// Discriminated union.
	children?: never;
	childIds?: never;
	parent?:   never;
	parentId?: never;
}

/** Specification of `Item` relations from a `children` getter and `identify` function. */
export type IdsFromChildren<Item, Id> = {
	identify:  Identify<Item, Id>;
	children:  GetChildren<Item>;

	// Discriminated union.
	childIds?: never;
	parent?:   never;
	parentId?: never;
	spec?:     never;
}

/** Specification of `Item` relations from a `childIds` getter. */
export type IdsFromChildIds<Item, Id> = {
	childIds:  IdentifyChildren<Item, Id>;

	// Discriminated union.
	children?: never;
	parent?:   never;
	parentId?: never;
	spec?:     never;
}

/** Specification of `Item` relations from a `parent` getter and `identify` function. */
export type IdsFromParents<Item, Id> = {
	identify:  Identify<Item, Id>;
	parent:    GetParent<Item>;

	// Discriminated union.
	parentId?: never;
	children?: never;
	childIds?: never;
	spec?:     never;
}

/** Specification of `Item` relations from a `parentId` getter. */
export type IdsFromParentIds<Item, Id> = {
	parentId:  IdentifyParent<Item, Id>;

	// Discriminated union.
	parent?:   never;
	children?: never;
	childIds?: never;
	spec?:     never;
}

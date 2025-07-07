import type { MultiMap, Some } from '@loken/utilities';

import type { Hierarchy } from '../hierarchies/hierarchy.js';
import type { Identify } from './identify.js';
import type { GetChildren, GetParent, IdentifyChildren, IdentifyParent } from './related-items.js';
import type { Relation } from '../relations/relation.types.js';


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
export interface IdsFromItems<Item, Id> { items: Some<Item>, identify: Identify<Item, Id> }


/** Specification of `Id` relations from an `IdSpec`. */
export interface IdsFromSpec<Id> {
	spec: IdSpec<Id>;

	// Discriminated union.
	children?: never;
	childIds?: never;
	parent?:   never;
	parentId?: never;
}

/** Specification of `Item` relations from a `children` getter and `identify` function. */
export interface IdsFromChildren<Item, Id> {
	identify: Identify<Item, Id>;
	children: GetChildren<Item>;

	// Discriminated union.
	childIds?: never;
	parent?:   never;
	parentId?: never;
	spec?:     never;
}

/** Specification of `Item` relations from a `childIds` getter. */
export interface IdsFromChildIds<Item, Id> {
	childIds: IdentifyChildren<Item, Id>;

	// Discriminated union.
	children?: never;
	parent?:   never;
	parentId?: never;
	spec?:     never;
}

/** Specification of `Item` relations from a `parent` getter and `identify` function. */
export interface IdsFromParents<Item, Id> {
	identify: Identify<Item, Id>;
	parent:   GetParent<Item>;

	// Discriminated union.
	parentId?: never;
	children?: never;
	childIds?: never;
	spec?:     never;
}

/** Specification of `Item` relations from a `parentId` getter. */
export interface IdsFromParentIds<Item, Id> {
	parentId: IdentifyParent<Item, Id>;

	// Discriminated union.
	parent?:   never;
	children?: never;
	childIds?: never;
	spec?:     never;
}

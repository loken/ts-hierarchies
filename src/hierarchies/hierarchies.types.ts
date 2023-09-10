import type { MultiMap } from '@loken/utilities';

import type { IdentifyOptional } from '../nodes/node-conversion.js';
import type { Relation } from '../nodes/relations.js';
import type { Hierarchy } from './hierarchy.js';


/**
 * Specification of how to create an `Id` hierarchy from a list of relations, a multi-map of `Id`s or a hierarchy.
 */
export type HierarchyIdSpec<Id> = Relation<Id>[] | MultiMap<Id> | Hierarchy<any, Id>;

/**
 * Specification of how to create an `Item` hierarchy from a list of relations, a multi-map of `Id`s,
 * a hierarchy or a function which identifies the optional parent of an item.
 */
export type HierarchyItemSpec<Item, Id> = HierarchyIdSpec<Id> | IdentifyOptional<Item, Id>;

import { type Some } from '@loken/utilities';


/**
 * Represent a relation in a hierarchy.
 * - `[parent, child]` represents a parent-child relationship
 * - `[node]` represents an isolated node (root with no children)
 */
export type Relation<Id> = readonly [parent: Id, child: Id] | readonly [node: Id];

/** The type of relation. */
export type RelType = 'ancestors' | 'descendants' | 'children';

/** One or more `RelType`s to use as a filter. */
export type RelTypeFilter = Some<RelType>;

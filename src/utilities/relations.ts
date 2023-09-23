import { type Multiple } from '@loken/utilities';


/** Represent a link between a `parent` and `child` using their `Id`s. */
export type Relation<Id> = readonly [parent: Id, child: Id];

/** The type of relation. */
export type RelType = 'ancestors' | 'descendants' | 'children';

/** One or more `RelType`s to use as a filter. */
export type RelTypeFilter = Multiple<RelType>;

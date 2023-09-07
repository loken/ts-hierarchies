import { iterateMultiple, MultiMap, type Multiple } from '@loken/utilities';


/** Represent a link between a `parent` and `child` using their `Id`s. */
export type Relation<Id> = readonly [parent: Id, child: Id];

/** The type of relation. */
export type RelType = 'ancestors' | 'descendants' | 'children';

/** One or more `RelType`s to use as a filter. */
export type RelTypeFilter = Multiple<RelType>;


/** Static helper for mapping between different representations of relations. */
export class Relations {

	/** Block instantiation by making the ctor private to simulate a static class. */
	private constructor() {}

	/** Create relations from the `childMap`. */
	public static fromChildMap<Id>(childMap: MultiMap<Id>): Relation<Id>[] {
		const relations: Relation<Id>[] = [];

		for (const [ parent, children ] of childMap.entries()) {
			for (const child of children.values())
				relations.push([ parent, child ]);
		}

		return relations;
	}

	/** Create a child map from the `relations`. */
	public static toChildMap<Id>(relations: Multiple<Relation<Id>>): MultiMap<Id> {
		const map = new MultiMap<Id>();

		for (const [ parent, child ] of iterateMultiple(relations))
			map.add(parent, child);

		return map;
	}

}

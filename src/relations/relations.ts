import { MultiMap, type Some } from '@loken/utilities';
import { HCNode } from '../nodes/node.js';
import type { Identify } from '../utilities/identify.js';
import type { Relation } from './relation.types.js';
import { relationsToNodes, relationsToChildMap } from './relations-to.js';
import { nodesToRelations } from '../nodes/nodes-to.js';
import { childMapToRelations } from '../maps/maps-to.js';


export class Relations {

	/**
	 * Build nodes linked as described by the provided `relations`.
	 *
	 * @template Id The type of IDs.
	 * @param relations The relations describing the hierarchy structure.
	 * @returns The root nodes.
	 */
	public static toNodes<Id>(relations: Some<Relation<Id>>): HCNode<Id>[] {
		return relationsToNodes(relations);
	}

	/**
	 * Create a list of relations by traversing the graph of the `roots`.
	 *
	 * @template Item The type of item.
	 * @template Id The type of IDs.
	 * @param roots The roots to use for traversal.
	 * @param identify Means of getting an ID for an item.
	 * @returns An array of `Relation<Id>`s.
	 */
	public static fromNodes<Item, Id = Item>(
		roots: Some<HCNode<Item>>,
		identify?: Identify<Item, Id>,
	): Relation<Id>[] {
		return nodesToRelations(roots, identify);
	}


	/**
	 * Create a child map from relations.
	 *
	 * @template Id The type of IDs.
	 * @param relations The relations describing the hierarchy structure.
	 * @returns A `MultiMap<Id>` representing the child map.
	 */
	public static toChildMap<Id>(relations: Some<Relation<Id>>): MultiMap<Id> {
		return relationsToChildMap(relations);
	}

	/**
	 * Create a list of relations from a child map.
	 *
	 * @template Id The type of IDs.
	 * @param childMap The map describing the relations.
	 * @returns An array of `Relation<Id>`s.
	 */
	public static fromChildMap<Id>(childMap: MultiMap<Id>): Relation<Id>[] {
		return childMapToRelations(childMap);
	}

}

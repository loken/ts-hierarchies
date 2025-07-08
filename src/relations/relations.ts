import { type Some } from '@loken/utilities';
import { HCNode } from '../nodes/node.ts';
import type { Identify } from '../utilities/identify.ts';
import type { Relation } from './relation.types.ts';
import { relationsToNodes } from './relations-to.ts';
import { nodesToRelations } from '../nodes/nodes-to.ts';

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

}

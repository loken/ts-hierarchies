import type { HCNode } from '../nodes/node.js';
import { Nodes } from '../nodes/nodes.js';
import { ChildMap } from '../maps/child-map.js';
import type { Identify } from '../utilities/identify.js';
import type { IdSpec, ItemIdOptions } from '../utilities/identity-options.js';
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

	/**
	 * Create a hierarchy of `Id`s matching the `spec`.
	 *
	 * @param spec Specification of how to create an `Id` hierarchy from a list of relations, a multi-map of `Id`s or a hierarchy.
	 */
	public static createWithIds<Id>(spec: IdSpec<Id>): Hierarchy<Id> {
		const childMap = ChildMap.fromIds(spec);
		const roots = Nodes.fromChildMap(childMap);

		return Hierarchies.createForIds<Id>().attachRoot(roots);
	}

	/**
	 * Create a hierarchy of `Id`s matching the properties of the `source`.
	 *
	 * @param source The object describing the relations.
	 * @param include Optional predicate used for determining whether a property should be included as an ID.
	 */
	public static createWithPropertyIds(source: object, include?: (prop: string, val: any) => boolean): Hierarchy<string> {
		const roots = Nodes.fromPropertyIds(source, include);

		return Hierarchies.createForIds<string>().attachRoot(roots);
	}

	/**
	 * Create a hierarchy of `Item`s matching details from the `options`.
	 *
	 * @template Item The type of item.
	 * @template Id The type of IDs.
	 * @param items The items to wrap in nodes.
	 * @param identify Means of getting an ID for an item.
	 * @param options Options with details on how to create an `Item` hierarchy from a list of relations, a multi-map of `Id`s,
 	 *                a hierarchy or functions for inferring the relations from each item.
	 * @returns The fully linked `Hierarchy<Item, Id>`.
	 */
	public static createWithItems<Item, Id>(options: ItemIdOptions<Item, Id>): Hierarchy<Item, Id> {
		let roots: HCNode<Item>[];

		if (options.children) {
			roots = Nodes.fromItemsWithChildren(options.items, options.children);
		}
		else if (options.parent) {
			roots = Nodes.fromItemsWithParents(options.items, options.parent);
		}
		else {
			const childMap = ChildMap.fromItems(options);

			roots = Nodes.fromItemsWithChildMap(options.items, options.identify, childMap);
		}

		return new Hierarchy<Item, Id>(options.identify).attachRoot(roots);
	}

}

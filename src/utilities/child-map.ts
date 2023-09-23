import { iterateMultiple, MultiMap, type Multiple } from '@loken/utilities';

import { Hierarchy } from '../hierarchies/hierarchy.js';
import type { Identify } from './identify.js';
import type { IdSpec, ItemIdOptions } from './identity-options.js';
import type { GetChildren, GetParent, IdentifyChildren, IdentifyParent } from './related-items.js';
import type { Relation } from './relations.js';


/**
 * Static helper for mapping a `MultiMap<Id>` representing a parent-to-child map,
 * and other representations of the same information.
 */
export class ChildMap {

	/** Block instantiation by making the ctor private to simulate a static class. */
	private constructor() {}


	/** Create a child-map from an `IdSpec`. */
	public static fromIds<Id>(spec: IdSpec<Id>): MultiMap<Id> {
		if (spec instanceof MultiMap)
			return spec;
		if (Array.isArray(spec))
			return ChildMap.fromRelations(spec);
		if (spec instanceof Hierarchy)
			return ChildMap.fromHierarchy(spec);

		throw new Error("Unsupported 'relations' specification.");
	}


	/** Create a child-map from `ItemIdOptions`. */
	public static fromItems<Item, Id>(options: ItemIdOptions<Item, Id>): MultiMap<Id> {
		if (options.spec)
			return ChildMap.fromIds(options.spec);
		if (options.children)
			return ChildMap.fromChildren(options.items, options.identify, options.children);
		if (options.childIds)
			return ChildMap.fromChildIds(options.items, options.identify, options.childIds);
		if (options.parent)
			return ChildMap.fromParents(options.items, options.identify, options.parent);
		if (options.parentId)
			return ChildMap.fromParentIds(options.items, options.identify, options.parentId);

		throw new Error('Unsupported specification object!');
	}


	/** Create a child-map from `items` using `identify` and `getChildren` delegates. */
	public static fromChildren<Item, Id>(items: Multiple<Item>, identify: Identify<Item, Id>, getChildren: GetChildren<Item>): MultiMap<Id> {
		const childMap = new MultiMap<Id>();

		for (const item of iterateMultiple(items)) {
			const childIds = getChildren(item)?.map(identify);
			if (childIds)
				childMap.add(identify(item), childIds);
		}

		return childMap;
	}

	/** Create a child-map from `items` using `identify` and `identifyChildren` delegates. */
	public static fromChildIds<Item, Id>(items: Multiple<Item>, identify: Identify<Item, Id>, identifyChildren: IdentifyChildren<Item, Id>): MultiMap<Id> {
		const childMap = new MultiMap<Id>();
		for (const item of iterateMultiple(items)) {
			const childIds = identifyChildren(item);
			if (childIds)
				childMap.add(identify(item), childIds);
		}

		return childMap;
	}

	/** Create a child-map from `items` using `identify` and `getParent` delegates. */
	public static fromParents<Item, Id>(items: Multiple<Item>, identify: Identify<Item, Id>, getParent: GetParent<Item>): MultiMap<Id> {
		const childMap = new MultiMap<Id>();
		for (const item of iterateMultiple(items)) {
			const parent = getParent(item);
			if (parent)
				childMap.add(identify(parent), identify(item));
		}

		return childMap;
	}

	/** Create a child-map from `items` using `identify` and `identifyParent` delegates. */
	public static fromParentIds<Item, Id>(items: Multiple<Item>, identify: Identify<Item, Id>, identifyParent: IdentifyParent<Item, Id>): MultiMap<Id> {
		const childMap = new MultiMap<Id>();
		for (const item of iterateMultiple(items)) {
			const parentId = identifyParent(item);
			if (parentId)
				childMap.add(parentId, identify(item));
		}

		return childMap;
	}


	/** Create a child map from the `hierarchy`. */
	public static fromHierarchy<Item, Id>(hierarchy: Hierarchy<Item, Id>): MultiMap<Id> {
		return hierarchy.toChildMap();
	}


	/** Create a child map from the `relations`. */
	public static fromRelations<Id>(relations: Multiple<Relation<Id>>): MultiMap<Id> {
		const map = new MultiMap<Id>();

		for (const [ parent, child ] of iterateMultiple(relations))
			map.add(parent, child);

		return map;
	}

	/** Create relations from the `childMap`. */
	public static toRelations<Id>(childMap: MultiMap<Id>): Relation<Id>[] {
		const relations: Relation<Id>[] = [];

		for (const [ parent, children ] of childMap.entries()) {
			for (const child of children.values())
				relations.push([ parent, child ]);
		}

		return relations;
	}

}

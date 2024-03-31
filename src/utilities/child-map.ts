import { iterateAll, MultiMap, ProbabilityScale, randomInt, type Some, someToIterable } from '@loken/utilities';

import { Hierarchy } from '../hierarchies/hierarchy.js';
import { traverseGraph } from '../traversal/traverse-graph.js';
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
		if (spec instanceof Map)
			return spec;
		if (Array.isArray(spec))
			return ChildMap.fromRelations(spec);
		if (spec instanceof Hierarchy)
			return ChildMap.fromHierarchy(spec);

		throw new Error("Unsupported 'relations' specification.");
	}

	/**
	 * Create a child-map from the nested property keys of the `source`.
	 *
	 * @param source The object describing the relations.
	 * @param include Optional predicate used for determining whether a property should be included as an ID.
	 */
	public static fromPropertyIds(source: object, include?: (prop: string, val: any) => boolean): MultiMap<string> {
		const childMap = new MultiMap<string>();
		const root: {parent?: string, obj: object} = { obj: source };

		iterateAll(traverseGraph({
			roots:  root,
			signal: ({ parent, obj }, signal) => {
				let entries = Object.entries(obj);
				if (include)
					entries = entries.filter(([ key, val ]) => include(key, val));

				if (parent)
					childMap.add(parent, entries.map(([ key ]) => key));

				const children = entries
					.filter(([ _, val ]) => typeof val === 'object')
					.map(([ key, val ]) => ({ parent: key, obj: val as object }));

				if (children.length)
					signal.next(children);
			},
		}));

		return childMap;
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
	public static fromChildren<Item, Id>(items: Some<Item>, identify: Identify<Item, Id>, getChildren: GetChildren<Item>): MultiMap<Id> {
		const childMap = new MultiMap<Id>();

		for (const item of someToIterable(items)) {
			const childIds = getChildren(item)?.map(identify);
			if (childIds?.length)
				childMap.add(identify(item), childIds);
		}

		return childMap;
	}

	/** Create a child-map from `items` using `identify` and `identifyChildren` delegates. */
	public static fromChildIds<Item, Id>(items: Some<Item>, identify: Identify<Item, Id>, identifyChildren: IdentifyChildren<Item, Id>): MultiMap<Id> {
		const childMap = new MultiMap<Id>();
		for (const item of someToIterable(items)) {
			const childIds = identifyChildren(item);
			if (childIds?.length)
				childMap.add(identify(item), childIds);
		}

		return childMap;
	}

	/** Create a child-map from `items` using `identify` and `getParent` delegates. */
	public static fromParents<Item, Id>(items: Some<Item>, identify: Identify<Item, Id>, getParent: GetParent<Item>): MultiMap<Id> {
		const childMap = new MultiMap<Id>();
		for (const item of someToIterable(items)) {
			const parent = getParent(item);
			if (parent)
				childMap.add(identify(parent), identify(item));
		}

		return childMap;
	}

	/** Create a child-map from `items` using `identify` and `identifyParent` delegates. */
	public static fromParentIds<Item, Id>(items: Some<Item>, identify: Identify<Item, Id>, identifyParent: IdentifyParent<Item, Id>): MultiMap<Id> {
		const childMap = new MultiMap<Id>();
		for (const item of someToIterable(items)) {
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
	public static fromRelations<Id>(relations: Some<Relation<Id>>): MultiMap<Id> {
		const map = new MultiMap<Id>();

		for (const [ parent, child ] of someToIterable(relations))
			map.add(parent, child);

		return map;
	}

	/** Create relations from the `childMap`. */
	public static toRelations<Id>(childMap: MultiMap<Id>): Relation<Id>[] {
		const relations: Relation<Id>[] = [];

		for (const [ parent, children ] of childMap) {
			for (const child of children)
				relations.push([ parent, child ]);
		}

		return relations;
	}

	/** Create a parent map from the `childMap`. */
	public static toParentMap<Id>(childMap: MultiMap<Id>, roots?: Set<Id>): Map<Id, Id | undefined> {
		const parentMap =  new Map<Id, Id | undefined>();
		roots ??= this.getRoots(childMap);

		// Add roots that are also leaves, as otherwise we lose them.
		for (const root of roots) {
			if (childMap.get(root)!.size === 0)
				parentMap.set(root, undefined);
		}

		for (const [ parent, children ] of childMap) {
			for (const child of children)
				parentMap.set(child, parent);
		}

		return parentMap;
	}

	/** Create a descendants map from the `childMap`. */
	public static toDescendantMap<Id>(childMap: MultiMap<Id>, parentMap?: Map<Id, Id | undefined>): MultiMap<Id> {
		parentMap ??= this.toParentMap(childMap);
		const descendantMap = new MultiMap<Id>();

		for (const [ child, parent ] of parentMap) {
			if (parent === undefined) {
				descendantMap.getOrAdd(child);
				continue;
			}

			let ancestor: Id | undefined = parent;
			while (ancestor !== undefined) {
				descendantMap.getOrAdd(ancestor).add(child);
				ancestor = parentMap.get(ancestor);
			}
		}

		return descendantMap;
	}


	/** Create an ancestor map from the `childMap`. */
	public static toAncestorMap<Id>(childMap: MultiMap<Id>, parentMap?: Map<Id, Id | undefined>): MultiMap<Id> {
		parentMap ??= this.toParentMap(childMap);
		const ancestorMap =  new MultiMap<Id>();

		for (const [ child, parent ] of parentMap) {
			const ancestors = ancestorMap.getOrAdd(child);

			let ancestor = parent;
			while (ancestor !== undefined) {
				ancestors.add(ancestor);
				ancestor = parentMap.get(ancestor);
			}
		}

		return ancestorMap;
	}


	/** Get the set of IDs representing the roots of the `childMap`. */
	public static getRoots<Id>(childMap: MultiMap<Id>) {
		const seenChildren = new Set<Id>();
		const roots = new Set<Id>();

		for (const [ parent, children ] of childMap) {
			if (!seenChildren.has(parent))
				roots.add(parent);

			for (const child of children) {
				seenChildren.add(child);
				roots.delete(child);
			}
		}

		return roots;
	}


	/**
	 * Add the `ancestors` to the `childMap`.
	 * @param ancestors The ancestor IDs organized from a node and up through its parents.
	 * @param childMap A child-map. Default: Empty `MultiMap`.
	 * @returns The `childMap`.
	 */
	public static addAncestors<Id>(ancestors: Id[], childMap = new MultiMap<Id>()) {
		if (ancestors.length === 0)
			return;

		if (ancestors.length === 1) {
			childMap.getOrAdd(ancestors[0]!);
		}
		else {
			ancestors.reduce((child, parent) => {
				childMap.add(parent, child);

				return parent;
			});
		}

		return childMap;
	}


	/**
	 * Generate a child map for `count` IDs using a `create` function and randomly created structure.
	 * @param count The number of IDs to create.
	 * @param create The delegate responsible for creating new IDs.
	 * @param chance Fraction chance to add move a layer deeper in the tree. (Default: 0.50)
	 * @param decay The decay to apply to the `chance` for each layer.
	 */
	public static generate<Id>(options: {
		count: number,
		create: (options: ({
			index: number,
			siblings: Id[],
			ancestry: Id[],
		})) => Id,
		chance?: number,
		decay?: number,
	}): MultiMap<Id> {
		const { count, create } = options;
		const childMap = new MultiMap<Id>();
		const roots: Id[] = [];

		for (let index = 0; index < count; index++) {
			const probability = new ProbabilityScale({
				mode:        'decay',
				probability: options.chance ?? .50,
				scale:       options.decay  ?? .10,
			});
			const ancestry: Id[] = [];
			let siblings = roots;

			while (siblings.length && probability.sample()) {
				const branch = siblings[siblings.length === 1 ? 0 : randomInt(0, siblings.length)]!;
				const children = childMap.get(branch);

				siblings = children ? [ ...children ] : [];
				ancestry.push(branch);
				probability.increment();
			}

			const id = create({ index, siblings, ancestry });

			if (ancestry.length === 0)
				roots.push(id);
			else
				childMap.add(ancestry.at(-1)!, id);
		}

		return childMap;
	}

}

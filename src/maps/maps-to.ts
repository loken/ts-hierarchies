import { MultiMap } from '@loken/utilities';
import type { Relation } from '../relations/relation.types.ts';


/** @internalexport */
export const childMapToRelations = <Id>(childMap: MultiMap<Id>): Relation<Id>[] => {
	const relations: Relation<Id>[] = [];

	for (const [ parent, children ] of childMap) {
		if (children.size === 0) {
			relations.push([ parent ]);
		}
		else {
			for (const child of children)
				relations.push([ parent, child ]);
		}
	}

	return relations;
};

/** @internalexport */
export const childMapToParentMap = <Id>(childMap: MultiMap<Id>, roots?: Set<Id>): Map<Id, Id | undefined> => {
	const parentMap =  new Map<Id, Id | undefined>();
	roots ??= childMapToRootIds(childMap);

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
};

/** @internalexport */
export const childMapToDescendantMap = <Id>(childMap: MultiMap<Id>, parentMap?: Map<Id, Id | undefined>): MultiMap<Id> => {
	parentMap ??= childMapToParentMap(childMap);
	const descendantMap = new MultiMap<Id>();

	for (const [ child, parent ] of parentMap) {
		if (parent === undefined) {
			descendantMap.addEmpty(child);
			continue;
		}

		let ancestor: Id | undefined = parent;
		while (ancestor !== undefined) {
			descendantMap.addEmpty(ancestor).add(child);
			ancestor = parentMap.get(ancestor);
		}
	}

	return descendantMap;
};

/** @internalexport */
export const childMapToAncestorMap = <Id>(childMap: MultiMap<Id>, parentMap?: Map<Id, Id | undefined>): MultiMap<Id> => {
	parentMap ??= childMapToParentMap(childMap);
	const ancestorMap =  new MultiMap<Id>();

	for (const [ child, parent ] of parentMap) {
		const ancestors = ancestorMap.addEmpty(child);

		let ancestor = parent;
		while (ancestor !== undefined) {
			ancestors.add(ancestor);
			ancestor = parentMap.get(ancestor);
		}
	}

	return ancestorMap;
};

/** @internalexport */
export const childMapToRootIds = <Id>(childMap: MultiMap<Id>): Set<Id> => {
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
};

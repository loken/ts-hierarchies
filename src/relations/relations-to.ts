import { MultiMap, type Some, someToIterable } from '@loken/utilities';
import { HCNode } from '../nodes/node.ts';
import type { Relation } from './relation.types.ts';


/** @internalexport */
export const relationsToChildMap = <Id>(relations: Some<Relation<Id>>): MultiMap<Id> => {
	const map = new MultiMap<Id>();

	for (const relation of someToIterable(relations)) {
		if (relation.length === 1) {
			const [ parent ] = relation;
			map.addEmpty(parent);
		}
		else {
			const [ parent, child ] = relation;
			map.add(parent, child);
		}
	}

	return map;
};

/** @internalexport */
export const relationsToNodes = <Id>(relations: Some<Relation<Id>>): HCNode<Id>[] => {
	const nodes = new Map<Id, HCNode<Id>>();
	const children = new Set<Id>();

	// Process all relations
	for (const relation of someToIterable(relations)) {
		if (relation.length === 1) {
			// One-sided relation: [node] - isolated node
			const [ nodeId ] = relation;
			if (!nodes.has(nodeId))
				nodes.set(nodeId, new HCNode(nodeId));
		}
		else {
			// Two-sided relation: [parent, child]
			const [ parentId, childId ] = relation;

			// Ensure parent node exists
			if (!nodes.has(parentId))
				nodes.set(parentId, new HCNode(parentId));

			// Ensure child node exists
			if (!nodes.has(childId))
				nodes.set(childId, new HCNode(childId));

			// Create the parent-child relationship
			const parentNode = nodes.get(parentId)!;
			const childNode = nodes.get(childId)!;
			parentNode.attach(childNode);

			// Track child nodes (they cannot be roots)
			children.add(childId);
		}
	}

	// Find roots: nodes that exist but are not children of any other node
	const roots: HCNode<Id>[] = [];
	for (const [ nodeId, node ] of nodes) {
		if (!children.has(nodeId))
			roots.push(node);
	}

	return roots;
};

/* eslint-disable @typescript-eslint/no-unused-vars */
import { expect, test } from 'vitest';
import { MultiMap, traverseRange } from '@loken/utilities';

import { Hierarchies } from './hierarchies.js';
import { Hierarchy } from './hierarchy.js';
import { Nodes } from '../nodes/nodes.js';
import type { Relation } from '../relations/relation.types.js';
import { traverseGraph } from '../traversal/graph-traverse.js';
import { traverseSequence } from '../traversal/sequence-traverse.js';


// #region Preamble
interface Item { parentId?: string | null; id: string; name: string }

const root: Item = { parentId: null, id: 'r', name: 'root' };
const a:    Item = { parentId: 'r', id: 'a', name: 'branch-A' };
const b:    Item = { parentId: 'r', id: 'b', name: 'branch-B' };
const a1:   Item = { parentId: 'a', id: 'a1', name: 'leaf-A1' };
const a2:   Item = { parentId: 'a', id: 'a2', name: 'leaf-A2' };
const items = [ root, a, b, a1, a2 ];

const relations: Relation<string>[] = [
	[ 'r' ],
	[ 'r', 'a' ],
	[ 'r', 'b' ],
	[ 'a', 'a1' ],
	[ 'a', 'a2' ],
];

const childMap = MultiMap.parse<string>(`
	r:a,b
	a:a1,a2
	`);
// #endregion

test('Compile README snippets', () => {
	// #region Quick start
	const hierarchy1 = Hierarchies.fromParentIds(items, i => i.id, i => i.parentId ?? undefined);
	const hierarchy2 = Hierarchies.fromRelationsWithItems(items, i => i.id, [
		[ 'r', 'a' ],
		[ 'r', 'b' ],
	]);

	// Retrieve and project descendants or ancestors.
	const getNodes = hierarchy1.getDescendants('a', true);
	const getItems = hierarchy1.getDescendantItems('a', true);
	const getIds   = hierarchy1.getDescendantIds('a', true);

	// Find matches by predicate
	const foundNodes = hierarchy1.find(n => n.item.name === 'a');
	const foundItems = hierarchy1.findItems(n => n.item.name === 'a');
	const foundIds   = hierarchy1.findIds(n => n.item.name === 'a');

	// Search to create a pruned clone of the hierarchy.
	const prunedHierarchy = hierarchy1.search([ 'a' ], { matches: true, ancestors: false, descendants: true });

	// Clone the entire hierarchy.
	const clonedHierarchy = hierarchy1.clone();

	expect(getNodes.length).toBeGreaterThan(0);
	expect(getItems.length).toBe(getNodes.length);
	expect(getIds.length).toBe(getNodes.length);

	expect(Array.isArray(foundNodes)).toBe(true);
	expect(Array.isArray(foundItems)).toBe(true);
	expect(Array.isArray(foundIds)).toBe(true);

	expect(prunedHierarchy).toBeInstanceOf(Hierarchy);
	expect(clonedHierarchy).toBeInstanceOf(Hierarchy);
	// #endregion


	// #region Mapping
	// Mapping between structure representations
	const relationsFromHierarchy = hierarchy1.toRelations();
	const childMapFromHierarchy  = hierarchy1.toChildMap();
	const nodesFromRelations     = Nodes.fromRelations(relationsFromHierarchy);
	const nodesFromChildMap      = Nodes.fromChildMap(childMapFromHierarchy);
	// Serialize between child map and text
	const textChildMap           = childMapFromHierarchy.render();
	const parsedChildMap         = MultiMap.parse(textChildMap);
	const parsedIntChildMap      = MultiMap.parse('0:1,2', { transform: parseInt });

	expect(nodesFromRelations.length).toBeGreaterThan(0);
	expect(nodesFromChildMap.length).toBeGreaterThan(0);
	// #endregion


	// #region Build imperatively
	const hierarchy = Hierarchies.createForItems<Item, string>(i => i.id);

	// Create nodes and attach them to each other
	const branchNodes = Nodes.create(a, b);
	const rootNode    = Nodes.create(root).attach(branchNodes);

	// Attach the root node as a hierarchy root. (Yes we can have multiple roots.)
	hierarchy.attachRoot(rootNode);

	// Create some leaf nodes and attach them to the "a" branch of the hierarchy directly.
	const leafNodes = Nodes.create(a1, a2);
	hierarchy.attach('a', leafNodes);
	// #endregion


	// #region Create from items with parent IDs
	const parentedHc = Hierarchies.fromParentIds(items, i => i.id, i => i.parentId);

	expect(parentedHc.has('a')).toBe(true);
	// #endregion


	// #region Create from relations
	const idHierarchyFromRelations   = Hierarchies.fromRelations(relations);
	const itemHierarchyFromRelations = Hierarchies.fromRelationsWithItems(items, i => i.id, relations);

	const idHierarchyFromMap         = Hierarchies.fromChildMap(childMap);
	const itemHierarchyFromMap       = Hierarchies.fromChildMapWithItems(items, i => i.id, childMap);

	expect(idHierarchyFromRelations.hasSome([ 'a' ])).toBe(true);
	expect(itemHierarchyFromRelations.hasSome([ 'a' ])).toBe(true);
	expect(idHierarchyFromMap.hasSome([ 'a' ])).toBe(true);
	expect(itemHierarchyFromMap.hasSome([ 'a' ])).toBe(true);
	// #endregion


	// #region Create from hierarchy
	// Create ID-hierarchy matching an item-hierarchy's structure
	const matchingIdHc = Hierarchies.fromHierarchy(parentedHc);

	// Create item-hierarchy matching an ID-hierarchy's structure
	const matchingItemHc = Hierarchies.fromHierarchyWithItems(items, i => i.id, matchingIdHc);
	// #endregion


	// #region Get by ID
	// Check existence
	hierarchy.has('a');
	hierarchy.hasSome([ 'a', 'b' ]);
	hierarchy.hasEvery([ 'a', 'b' ]);

	// Get a single item
	hierarchy.get('a');
	hierarchy.getItems('a');

	// Get multiple items
	hierarchy.getSome([ 'a', 'b' ]);
	hierarchy.getSomeItems([ 'a', 'b' ]);
	// #endregion


	// #region Find by predicate
	hierarchy.find(n => n.item.name === 'a');
	hierarchy.findItems(n => n.item.name === 'a');
	hierarchy.findIds(n => n.item.name === 'a');
	// #endregion


	// #region Get descendants and ancestors
	// Get descendants/ancestors by ID
	hierarchy.getDescendants('a');
	hierarchy.getDescendantItems('a');
	hierarchy.getDescendantIds('a');
	// Get descendants/ancestors by IDs
	hierarchy.getDescendants([ 'a', 'b' ]);
	hierarchy.getDescendantItems([ 'a', 'b' ]);
	hierarchy.getDescendantIds([ 'a', 'b' ]);
	// #endregion


	// #region Find descendants and ancestors
	// Find the first matching descendant of a single starting node.
	hierarchy.findDescendant('a', 'a2');
	hierarchy.findDescendant('a', [ 'a1', 'a2' ]);
	hierarchy.findDescendant('a', n => n.item.id.endsWith('2'));

	// Find the first matching descendant of multiple starting nodes.
	hierarchy.findDescendant([ 'a', 'b' ], 'a2');
	hierarchy.findDescendant([ 'a', 'b' ], [ 'a1', 'a2' ]);
	hierarchy.findDescendant([ 'a', 'b' ], n => n.item.id.endsWith('2'));

	// Find all matching descendants of a single starting node.
	hierarchy.findDescendants('a', [ 'a1', 'a2' ]);
	hierarchy.findDescendants('a', n => n.item.id.endsWith('2'));
	hierarchy.findDescendantIds('a', [ 'a1', 'a2' ]);
	hierarchy.findDescendantIds('a', n => n.item.id.endsWith('2'));
	hierarchy.findDescendantItems('a', [ 'a1', 'a2' ]);
	hierarchy.findDescendantItems('a', n => n.item.id.endsWith('2'));

	// Find all matching descendants of multiple starting nodes.
	hierarchy.findDescendants([ 'a', 'b' ], [ 'a1', 'a2' ]);
	hierarchy.findDescendants([ 'a', 'b' ], n => n.item.id.endsWith('2'));
	hierarchy.findDescendantIds([ 'a', 'b' ], [ 'a1', 'a2' ]);
	hierarchy.findDescendantIds([ 'a', 'b' ], n => n.item.id.endsWith('2'));
	hierarchy.findDescendantItems([ 'a', 'b' ], [ 'a1', 'a2' ]);
	hierarchy.findDescendantItems([ 'a', 'b' ], n => n.item.id.endsWith('2'));
	// #endregion


	// #region Search for sub-hierarchy
	// Create a hierarchy consisting of the root, "a", "a1" and "a2", effectively excluding branch "b".
	hierarchy.search('a', { matches: true, ancestors: true, descendants: true });
	// Create a hierarchy consisting of the node "a" and its ancestors "r".
	hierarchy.search('a', { matches: true, ancestors: true });
	// Create a hierarchy consisting of the branch "a" as its root.
	hierarchy.search('a', { matches: true, descendants: true });
	// Create a hierarchy consisting of the branches "a" and "b" as its roots.
	hierarchy.search([ 'a', 'b' ], { matches: true, descendants: true });
	// Create a hierarchy consisting of nodes with a single letter ID; "r", "a", "b".
	hierarchy.search(n => n.item.id.length === 1, { matches: true, descendants: false });
	// #endregion


	// #region Node retrieval
	branchNodes[0].getDescendants(true, 'depth-first');
	branchNodes[0].getAncestors(true);
	// #endregion


	// #region Graph traversal
	// Simple traversal
	traverseGraph({
		roots: rootNode,
		next:  node => node.children,
	});

	// Advanced traversal with signal controller (prune/skip/early stop)
	traverseGraph({
		roots:  rootNode,
		signal: (node, signal) => {
			// Don't traverse into the children of "a1"
			if (node.item.id !== 'a1')
				signal.next(node.children);
			// Don't yield for "a"
			if (node.parent?.item.id === 'a')
				signal.skip();
			// If you reach "x", stop the traversal
			if (node.item.id === 'x')
				signal.stop();
		},
	});
	// Also provides options for detectCycles and traversal type.
	// #endregion


	// #region Sequence traversal
	interface El { value: number; next?: El }
	const el4: El = { value: 4 };
	const el3: El = { value: 3, next: el4 };
	const el2: El = { value: 2, next: el3 };
	const el1: El = { value: 1, next: el2 };

	const elements = traverseSequence({
		first:  el1,
		signal: (el, signal) => {
			// Skip odd numbers
			if (el.value % 2 === 1)
				signal.skip();
			// Provide next when continuing
			if (el.next)
				signal.next(el.next);
		},
	});
	// #endregion
});

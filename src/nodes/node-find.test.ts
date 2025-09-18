import { test, expect, describe } from 'vitest';
import { Nodes } from './nodes.ts';

// Create explicit hierarchy for testing:
// A -> A1 -> A11
//   -> A2 -> A12
// B -> B1 -> B12
// C
const nodeA   = Nodes.create('A');
const nodeA1  = Nodes.create('A1');
const nodeA2  = Nodes.create('A2');
const nodeA11 = Nodes.create('A11');
const nodeA12 = Nodes.create('A12');
const nodeB   = Nodes.create('B');
const nodeB1  = Nodes.create('B1');
const nodeB12 = Nodes.create('B12');
const nodeC   = Nodes.create('C');

// Build the hierarchy
nodeA.attach([ nodeA1, nodeA2 ]);
nodeA1.attach([ nodeA11, nodeA12 ]);
nodeB.attach(nodeB1);
nodeB1.attach(nodeB12);

const roots = [ nodeA, nodeB, nodeC ];

describe('hasDescendant', () => {
	test('returns true when descendant exists', () => {
		const actual = Nodes.hasDescendant(roots, n => n.item === 'A11');
		expect(actual).toBe(true);
	});

	test('returns false when descendant does not exist', () => {
		const actual = Nodes.hasDescendant(roots, n => n.item === 'X');
		expect(actual).toBe(false);
	});

	test('works with-self', () => {
		const actual = Nodes.hasDescendant(nodeA, n => n.item === 'A', 'with-self');
		expect(actual).toBe(true);
	});
});

describe('hasAncestor', () => {
	test('returns true when ancestor exists', () => {
		const actual = Nodes.hasAncestor(nodeA11, n => n.item === 'A');
		expect(actual).toBe(true);
	});

	test('returns false when ancestor does not exist', () => {
		const actual = Nodes.hasAncestor(nodeA11, n => n.item === 'B');
		expect(actual).toBe(false);
	});

	test('works with includeSelf=true', () => {
		const actual = Nodes.hasAncestor(nodeA11, n => n.item === 'A11', true);
		expect(actual).toBe(true);
	});
});

describe('getAncestors', () => {
	test('gets all unique ancestors from single node', () => {
		const actual = Nodes.getAncestors(nodeA11);
		const items = actual.map(n => n.item);
		expect(items).toEqual([ 'A1', 'A' ]);
	});

	test('gets all unique ancestors with includeSelf=true', () => {
		const actual = Nodes.getAncestors(nodeA11, true);
		const items = actual.map(n => n.item);
		expect(items).toEqual([ 'A11', 'A1', 'A' ]);
	});

	test('deduplicates ancestors from multiple nodes', () => {
		const nodes = [ nodeA11, nodeA12, nodeB1 ];
		const nodeItems = nodes.map(n => n.item);
		// The input nodes are in this order: A11, A12, B1
		expect(nodeItems).to.have.ordered.members([ 'A11', 'A12', 'B1' ]);

		// A11 is processed first: adds A1, A (bottom-up from A11)
		// A12 is processed next: A1, A already seen, so skipped
		// B1 is processed last: adds B (bottom-up from B1)
		const expected = [ 'A1', 'A', 'B' ];
		const actual = Nodes.getAncestors(nodes);
		const items = actual.map(n => n.item);
		expect(items).to.have.ordered.members(expected);
	});

	test('handles single node optimization', () => {
		const actual = Nodes.getAncestors(nodeA11);
		const items = actual.map(n => n.item);
		expect(items).toEqual([ 'A1', 'A' ]);
	});
});

describe('getDescendants', () => {
	test('gets all descendants breadth-first by default', () => {
		const actual = Nodes.getDescendants(nodeA);
		const items = actual.map(n => n.item);
		expect(items).toEqual([ 'A1', 'A2', 'A11', 'A12' ]);
	});

	test('gets all descendants with-self', () => {
		const actual = Nodes.getDescendants(nodeA, 'with-self');
		const items = actual.map(n => n.item);
		expect(items).toEqual([ 'A', 'A1', 'A2', 'A11', 'A12' ]);
	});

	test('supports depth-first traversal', () => {
		const actual = Nodes.getDescendants(nodeA, 'depth-first');
		const items = actual.map(n => n.item);
		expect(items).toEqual([ 'A2', 'A1', 'A12', 'A11' ]);
	});
});

describe('findDescendant', () => {
	test('finds first descendant matching predicate', () => {
		const actual = Nodes.findDescendant(roots, n => n.item.startsWith('A1'));
		expect(actual?.item).toBe('A1');
	});

	test('finds first descendant with-self', () => {
		const actual = Nodes.findDescendant(nodeA, n => n.item === 'A', 'with-self');
		expect(actual?.item).toBe('A');
	});

	test('returns undefined when no match found', () => {
		const actual = Nodes.findDescendant(roots, n => n.item === 'X');
		expect(actual).toBeUndefined();
	});

	test('supports depth-first and breadth-first traversal', () => {
		// Breadth-first traversal: A1, A2, B1, A11, A12, B12 => A11
		const breadthFirst = Nodes.findDescendant(roots, n => n.item === 'A11' || n.item === 'B12', 'breadth-first');
		expect(breadthFirst?.item).toBe('A11');

		// Depth-first traversal: B1, B12, A2, A1, A12, A11 => B12
		const depthFirst = Nodes.findDescendant(roots, n => n.item === 'A11' || n.item === 'B12', 'depth-first');
		expect(depthFirst?.item).toBe('B12');
	});
});

describe('findDescendants', () => {
	test('finds all descendants matching predicate', () => {
		const actual = Nodes.findDescendants(roots, n => n.item.startsWith('A1'));
		const items = actual.map(n => n.item).sort();
		expect(items).toEqual([ 'A1', 'A11', 'A12' ]);
	});

	test('finds all descendants with-self', () => {
		const actual = Nodes.findDescendants(nodeA, n => n.item.startsWith('A'), 'with-self');
		const items = actual.map(n => n.item).sort();
		expect(items).toEqual([ 'A', 'A1', 'A11', 'A12', 'A2' ]);
	});

	test('returns empty array when no match found', () => {
		const actual = Nodes.findDescendants(roots, n => n.item === 'X');
		expect(actual).toEqual([]);
	});
});

describe('findAncestor', () => {
	test('finds first ancestor matching predicate', () => {
		const actual = Nodes.findAncestor(nodeA11, n => n.item.startsWith('A'));
		expect(actual?.item).toBe('A1');
	});

	test('finds first ancestor with includeSelf=true', () => {
		const actual = Nodes.findAncestor(nodeA11, n => n.item === 'A11', true);
		expect(actual?.item).toBe('A11');
	});

	test('returns undefined when no match found', () => {
		const actual = Nodes.findAncestor(nodeA11, n => n.item === 'X');
		expect(actual).toBeUndefined();
	});

	test('handles multiple starting nodes with deduplication', () => {
		const actual = Nodes.findAncestor([ nodeA11, nodeA12 ], n => n.item === 'A1');
		expect(actual?.item).toBe('A1');
	});

	test('handles single node optimization', () => {
		const actual = Nodes.findAncestor(nodeA11, n => n.item === 'A1');
		expect(actual?.item).toBe('A1');
	});
});

describe('findAncestors', () => {
	test('finds all ancestors matching predicate', () => {
		const actual = Nodes.findAncestors(nodeA11, n => n.item.startsWith('A'));
		const items = actual.map(n => n.item).sort();
		expect(items).toEqual([ 'A', 'A1' ]);
	});

	test('finds all ancestors with includeSelf=true', () => {
		const actual = Nodes.findAncestors(nodeA11, n => n.item.startsWith('A'), true);
		const items = actual.map(n => n.item).sort();
		expect(items).toEqual([ 'A', 'A1', 'A11' ]);
	});

	test('returns empty array when no match found', () => {
		const actual = Nodes.findAncestors(nodeA11, n => n.item === 'X');
		expect(actual).toEqual([]);
	});

	test('handles multiple starting nodes with deduplication', () => {
		const actual = Nodes.findAncestors([ nodeA11, nodeA12, nodeB1 ], n => [ 'A', 'A1', 'B' ].includes(n.item), true);
		const items = actual.map(n => n.item).sort();
		expect(items).toEqual([ 'A', 'A1', 'B' ]);
	});

	test('handles single node optimization', () => {
		const actual = Nodes.findAncestors(nodeA11, n => n.item.startsWith('A'));
		const items = actual.map(n => n.item).sort();
		expect(items).toEqual([ 'A', 'A1' ]);
	});
});

describe('traverseDescendants', () => {
	test('returns generator for descendants', () => {
		const actual = Nodes.traverseDescendants(nodeA);
		const items = [ ...actual ].map(n => n.item);
		expect(items).toEqual([ 'A1', 'A2', 'A11', 'A12' ]);
	});

	test('works with-self', () => {
		const actual = Nodes.traverseDescendants(nodeA, 'with-self');
		const items = [ ...actual ].map(n => n.item);
		expect(items).toEqual([ 'A', 'A1', 'A2', 'A11', 'A12' ]);
	});
});

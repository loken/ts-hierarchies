import { describe, expect, test } from 'vitest';

import { Nodes } from './nodes.js';

// Create hierarchy of individually attached nodes so we have references.
// A -> A1 -> A11
//   -> A2 -> A12
// B -> B1 -> B12
// C
const nodeRoot = Nodes.create('Root');
const nodeA = Nodes.create('A');
const nodeB = Nodes.create('B');
const nodeA1 = Nodes.create('A1');
const nodeA2 = Nodes.create('A2');
const nodeA11 = Nodes.create('A11');
const nodeA12 = Nodes.create('A12');
const nodeA21 = Nodes.create('A21');
const nodeA22 = Nodes.create('A22');
const nodeB1 = Nodes.create('B1');
const nodeB2 = Nodes.create('B2');
const nodeB11 = Nodes.create('B11');

// Build the hierarchy
nodeRoot.attach([ nodeA, nodeB ]);
nodeA.attach([ nodeA1, nodeA2 ]);
nodeA1.attach([ nodeA11, nodeA12 ]);
nodeA2.attach([ nodeA21, nodeA22 ]);
nodeB.attach([ nodeB1, nodeB2 ]);
nodeB1.attach(nodeB11);

describe('Nodes.findCommonAncestor', () => {
	test('findCommonAncestor() finds closest common ancestor', () => {
		// A11 and A12 should have A1 as common ancestor
		expect(Nodes.findCommonAncestor([ nodeA11, nodeA12 ])).toBe(nodeA1);

		// A11 and A21 should have A as common ancestor
		expect(Nodes.findCommonAncestor([ nodeA11, nodeA21 ])).toBe(nodeA);

		// A11 and B11 should have Root as common ancestor
		expect(Nodes.findCommonAncestor([ nodeA11, nodeB11 ])).toBe(nodeRoot);
	});

	test('findCommonAncestor() with single item returns first ancestor item', () => {
		// A11's first ancestor should be A1
		expect(Nodes.findCommonAncestor([ nodeA11 ])).toBe(nodeA1);
	});

	test('findCommonAncestor() with single root item returns undefined', () => {
		// Root has no ancestors
		expect(Nodes.findCommonAncestor([ nodeRoot ])).toBeUndefined();
	});

	test('findCommonAncestor() with non-existent items returns undefined', () => {
		const nonExistent1 = Nodes.create('NonExistent1');
		const nonExistent2 = Nodes.create('NonExistent2');
		expect(Nodes.findCommonAncestor([ nonExistent1, nonExistent2 ])).toBeUndefined();
	});

	test('findCommonAncestor() with-self finds ancestor including target nodes', () => {
		// A1 and A11 with-self should return A1 (since A1 is ancestor of A11 and includeSelf includes A1)
		expect(Nodes.findCommonAncestor([ nodeA1, nodeA11 ], 'with-self')).toBe(nodeA1);
	});
});

describe('Nodes.findCommonAncestors', () => {
	test('findCommonAncestors() returns all common ancestors', () => {
		const ancestors = Nodes.findCommonAncestors([ nodeA11, nodeA12 ]);
		expect(ancestors).toEqual([ nodeA1, nodeA, nodeRoot ]);
	});

	test('findCommonAncestors() returns all ancestors for single node', () => {
		const ancestors = Nodes.findCommonAncestors([ nodeA11 ]);
		expect(ancestors).toEqual([ nodeA1, nodeA, nodeRoot ]);
	});

	test('findCommonAncestors() returns empty for single root', () => {
		const ancestors = Nodes.findCommonAncestors([ nodeRoot ]);
		expect(ancestors).empty;
	});

	test('findCommonAncestors() with-self returns queried root item', () => {
		const ancestors = Nodes.findCommonAncestors([ nodeRoot ], 'with-self');
		expect(ancestors).toEqual([ nodeRoot ]);
	});

	test('findCommonAncestors() with unrelated branches returns root', () => {
		const ancestors = Nodes.findCommonAncestors([ nodeA11, nodeB11 ]);
		expect(ancestors).toEqual([ nodeRoot ]);
	});

	test('findCommonAncestors() with no common ancestors returns empty', () => {
		const nonExistent1 = Nodes.create('NonExistent1');
		const nonExistent2 = Nodes.create('NonExistent2');
		const ancestors = Nodes.findCommonAncestors([ nonExistent1, nonExistent2 ]);
		expect(ancestors).empty;
	});
});

describe('Nodes.findCommonAncestorSet', () => {
	test('findCommonAncestorSet() returns set of common ancestors', () => {
		const actual = Nodes.findCommonAncestorSet([ nodeA11, nodeA12 ]);
		expect(actual).to.have.members([ nodeA1, nodeA, nodeRoot ]);
	});

	test('findCommonAncestorSet() returns empty set when there are no common ancestors', () => {
		const nonExistent1 = Nodes.create('NonExistent1');
		const nonExistent2 = Nodes.create('NonExistent2');
		const actual = Nodes.findCommonAncestorSet([ nonExistent1, nonExistent2 ]);
		expect(actual).empty;
	});
});

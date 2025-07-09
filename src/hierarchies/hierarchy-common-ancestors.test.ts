import { MultiMap } from '@loken/utilities';
import { expect, test } from 'vitest';

import { Hierarchies } from './hierarchies.js';

// Test data setup - more complex hierarchy for common ancestor testing
const hierarchy = Hierarchies.createWithIds(MultiMap.parse(`
Root:A,B
A:A1,A2
A1:A11,A12
A2:A21,A22
B:B1,B2
B1:B11
`));

test('findCommonAncestorId() finds closest common ancestor ID', () => {
	// A11 and A12 should have A1 as common ancestor
	expect(hierarchy.findCommonAncestorId([ 'A11', 'A12' ])).toBe('A1');

	// A11 and A21 should have A as common ancestor
	expect(hierarchy.findCommonAncestorId([ 'A11', 'A21' ])).toBe('A');

	// A11 and B11 should have Root as common ancestor
	expect(hierarchy.findCommonAncestorId([ 'A11', 'B11' ])).toBe('Root');
});

test('findCommonAncestorId() with single ID returns first ancestor ID', () => {
	// A11's first ancestor should be A1
	expect(hierarchy.findCommonAncestorId([ 'A11' ])).toBe('A1');
});

test('findCommonAncestorId() with single root ID returns undefined', () => {
	// Root has no ancestors
	expect(hierarchy.findCommonAncestorId([ 'Root' ])).toBeUndefined();
});

test('findCommonAncestorId() with non-existent IDs returns undefined', () => {
	expect(hierarchy.findCommonAncestorId([ 'NonExistent1', 'NonExistent2' ])).toBeUndefined();
});

test('findCommonAncestorId() with includeSelf finds ancestor including target nodes', () => {
	// A1 and A11 with includeSelf should return A1 (since A1 is ancestor of A11 and includeSelf includes A1)
	expect(hierarchy.findCommonAncestorId([ 'A1', 'A11' ], true)).toBe('A1');
});

test('findCommonAncestorIds() returns all common ancestor IDs', () => {
	const ancestorIds = hierarchy.findCommonAncestorIds([ 'A11', 'A12' ]);
	expect(ancestorIds).toEqual([ 'A1', 'A', 'Root' ]);
});

test('findCommonAncestorIds() returns all ancestors for single ID', () => {
	const ancestorIds = hierarchy.findCommonAncestorIds([ 'A11' ]);
	expect(ancestorIds).toEqual([ 'A1', 'A', 'Root' ]);
});

test('findCommonAncestorIds() returns empty for single root ID', () => {
	const ancestorIds = hierarchy.findCommonAncestorIds([ 'Root' ]);
	expect(ancestorIds).toEqual([]);
});

test('findCommonAncestorIds() with include self returns queried root ID', () => {
	const ancestorIds = hierarchy.findCommonAncestorIds([ 'Root' ], true);
	expect(ancestorIds).toEqual([ 'Root' ]);
});

test('findCommonAncestorIds() with multiple unrelated branches', () => {
	// Test nodes from completely different branches
	const ancestorIds = hierarchy.findCommonAncestorIds([ 'A11', 'B11' ]);
	expect(ancestorIds).toEqual([ 'Root' ]);
});

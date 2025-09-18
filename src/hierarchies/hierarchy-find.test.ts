import { MultiMap } from '@loken/utilities';
import { expect, test } from 'vitest';

import { Hierarchies } from './hierarchies.js';

// Test data setup
const hierarchy = Hierarchies.fromChildMap(MultiMap.parse(`
A:A1,A2
A1:A11,A12
A2:A21
B:B1
B1:B11,B12
`));

// Tests for hierarchy-specific find behavior (ID-based search conversion)

test('find() with existing IDs returns matching nodes', () => {
	const foundNodes = hierarchy.find([ 'A', 'B' ]);
	expect(foundNodes).toHaveLength(2);
	expect(foundNodes.map((n) => n.item)).toEqual([ 'A', 'B' ]);
});

test('find() with mix of existing and non-existing IDs returns only existing', () => {
	const foundNodes = hierarchy.find([ 'A', 'NonExistent', 'B' ]);
	expect(foundNodes).toHaveLength(2);
	expect(foundNodes.map((n) => n.item)).toEqual([ 'A', 'B' ]);
});

test('find() with all non-existing IDs returns empty array', () => {
	const foundNodes = hierarchy.find([ 'NonExistent1', 'NonExistent2' ]);
	expect(foundNodes).toHaveLength(0);
});

test('find() with single existing ID returns matching node', () => {
	const foundNodes = hierarchy.find('A');
	expect(foundNodes).toHaveLength(1);
	expect(foundNodes[0]?.item).toEqual('A');
});

test('find() with single non-existing ID returns empty array', () => {
	const foundNodes = hierarchy.find('NonExistent');
	expect(foundNodes).toHaveLength(0);
});

test('findAncestorId() with single ID search', () => {
	// Find ancestor A1 starting from A11, searching for A
	const ancestorId = hierarchy.findAncestorId([ 'A11' ], 'A');
	expect(ancestorId).toBe('A');
});

test('findAncestorId() with array ID search', () => {
	// Find ancestor from A11, searching for any of these IDs
	const ancestorId = hierarchy.findAncestorId([ 'A11' ], [ 'B', 'A1', 'A' ]);
	expect(ancestorId).toBe('A1'); // Should find A1 first (closest ancestor)
});

test('findAncestorId() with Set ID search', () => {
	// Find ancestor from A11, searching for any ID in the set
	const searchSet = new Set([ 'B', 'A1', 'A' ]);
	const ancestorId = hierarchy.findAncestorId([ 'A11' ], searchSet);
	expect(ancestorId).toBe('A1'); // Should find A1 first (closest ancestor)
});

test('findAncestorId() with predicate function search', () => {
	// Find ancestor using a custom predicate
	const ancestorId = hierarchy.findAncestorId([ 'A11' ], node => node.item.length === 1);
	expect(ancestorId).toBe('A'); // Should find A (length 1) before root
});

test('findAncestorId() with non-existent ID search returns undefined', () => {
	const ancestorId = hierarchy.findAncestorId([ 'A11' ], 'NonExistent');
	expect(ancestorId).toBeUndefined();
});

test('findAncestorId() with includeSelf finds starting node', () => {
	// Search for A1 starting from A1 with includeSelf
	const ancestorId = hierarchy.findAncestorId([ 'A1' ], 'A1', true);
	expect(ancestorId).toBe('A1');
});

test('findDescendantId() with single ID search', () => {
	// Find descendant starting from A, searching for A11
	const descendantId = hierarchy.findDescendantId([ 'A' ], 'A11');
	expect(descendantId).toBe('A11');
});

test('findDescendantId() with array ID search', () => {
	// Find descendant from A, searching for any of these IDs
	const descendantId = hierarchy.findDescendantId([ 'A' ], [ 'B11', 'A11', 'A21' ]);
	expect(descendantId).toBe('A11'); // Should find A11 first (breadth-first order)
});

test('findDescendantId() with Set ID search', () => {
	// Find descendant from A, searching for any ID in the set
	const searchSet = new Set([ 'B11', 'A11', 'A21' ]);
	const descendantId = hierarchy.findDescendantId([ 'A' ], searchSet);
	expect(descendantId).toBe('A11'); // Should find A11 first (breadth-first order)
});

test('findDescendantId() with predicate function search', () => {
	// Find descendant using a custom predicate - leaf nodes
	const descendantId = hierarchy.findDescendantId([ 'A' ], node => node.isLeaf);
	expect(descendantId).toBe('A11'); // Should find first leaf in breadth-first order
});

test('findDescendantId() with non-existent ID search returns undefined', () => {
	const descendantId = hierarchy.findDescendantId([ 'A' ], 'NonExistent');
	expect(descendantId).toBeUndefined();
});

test('findDescendantId() with-self finds starting node', () => {
	// Search for A starting from A with includeSelf
	const descendantId = hierarchy.findDescendantId([ 'A' ], 'A', 'with-self');
	expect(descendantId).toBe('A');
});

test('findAncestorIds() returns multiple matching ancestors', () => {
	// Find all ancestors of A11 that have single-character IDs
	const ancestorIds = hierarchy.findAncestorIds([ 'A11' ], [ 'A' ]);
	expect(ancestorIds).toEqual([ 'A' ]);
});

test('findDescendantIds() returns multiple matching descendants', () => {
	// Find all leaf descendants of A
	const descendantIds = hierarchy.findDescendantIds([ 'A' ], node => node.isLeaf);
	expect(descendantIds).toEqual([ 'A11', 'A12', 'A21' ]);
});

test('find methods work with multiple starting IDs', () => {
	// Find common ancestor starting from multiple nodes
	const ancestorId = hierarchy.findAncestorId([ 'A11', 'A21' ], 'A');
	expect(ancestorId).toBe('A');

	// Find descendants starting from multiple nodes
	const descendantIds = hierarchy.findDescendantIds([ 'A1', 'B1' ], node => node.isLeaf);
	expect(descendantIds).toEqual([ 'A11', 'A12', 'B11', 'B12' ]);
});

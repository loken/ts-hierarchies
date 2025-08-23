import { MultiMap } from '@loken/utilities';
import { assert, expect, test } from 'vitest';

import { Hierarchies } from './hierarchies.js';


const testHierarchy = Hierarchies.fromChildMap(MultiMap.parse(`
A:A1,A2
A1:A11,A12
A2:A21
B:B1
B1:B11,B12
`));

test('hierarchy.has() single ID returns boolean', () => {
	expect(testHierarchy.has('A')).toBe(true);
	expect(testHierarchy.has('A1')).toBe(true);
	expect(testHierarchy.has('NonExistent')).toBe(false);
});

test('hierarchy.has() multiple IDs returns tuple of booleans', () => {
	const [ hasA, hasB, hasNonExistent ] = testHierarchy.has('A', 'B', 'NonExistent');

	expect(hasA).toBe(true);
	expect(hasB).toBe(true);
	expect(hasNonExistent).toBe(false);
});

test('hierarchy.hasEvery() returns true when all IDs exist', () => {
	expect(testHierarchy.hasEvery([ 'A', 'A1', 'B' ])).toBe(true);
	expect(testHierarchy.hasEvery([ 'A', 'NonExistent' ])).toBe(false);
	expect(testHierarchy.hasEvery([])).toBe(true); // Empty array should return true
});

test('hierarchy.hasSome() returns true when any ID exists', () => {
	expect(testHierarchy.hasSome([ 'A', 'B' ])).toBe(true);
	expect(testHierarchy.hasSome([ 'A', 'NonExistent' ])).toBe(true);
	expect(testHierarchy.hasSome([ 'NonExistent1', 'NonExistent2' ])).toBe(false);
	expect(testHierarchy.hasSome([])).toBe(false); // Empty array should return false
});

test('hierarchy.get() single ID returns node', () => {
	const nodeA = testHierarchy.get('A');
	expect(nodeA.item).toBe('A');
});

test('hierarchy.get() multiple IDs returns tuple of nodes', () => {
	const [ nodeA, nodeB ] = testHierarchy.get('A', 'B');
	expect(nodeA.item).toBe('A');
	expect(nodeB.item).toBe('B');
});

test('hierarchy.get() non-existent ID throws with helpful message', () => {
	assert.throws(
		() => testHierarchy.get('NonExistent'),
		/Node with ID 'NonExistent' not found in hierarchy/,
	);
});

test('hierarchy.getSome() returns existing nodes', () => {
	const nodes = testHierarchy.getSome([ 'A', 'B' ]);
	expect(nodes).toHaveLength(2);
	expect(nodes.map((n) => n.item)).toEqual([ 'A', 'B' ]);
});

test('hierarchy.getSome() throws for non-existent ID', () => {
	assert.throws(
		() => testHierarchy.getSome([ 'A', 'NonExistent', 'B' ]),
		/Node with ID 'NonExistent' not found in hierarchy/,
	);
});

test('hierarchy.getSome() with empty array returns empty array', () => {
	const nodes = testHierarchy.getSome([]);
	expect(nodes).toEqual([]);
});

test('hierarchy.getItems() single ID returns item', () => {
	const itemA = testHierarchy.getItems('A');
	expect(itemA).toBe('A');
});

test('hierarchy.getItems() multiple IDs returns tuple of items', () => {
	const [ itemA, itemB ] = testHierarchy.getItems('A', 'B');
	expect(itemA).toBe('A');
	expect(itemB).toBe('B');
});

test('hierarchy.getItems() non-existent ID throws', () => {
	assert.throws(
		() => testHierarchy.getItems('NonExistent'),
		/Node with ID 'NonExistent' not found in hierarchy/,
	);
});

test('hierarchy.getSomeItems() returns existing items', () => {
	const items = testHierarchy.getSomeItems([ 'A', 'B' ]);
	expect(items).toEqual([ 'A', 'B' ]);
});

test('hierarchy.getSomeItems() throws for non-existent ID', () => {
	assert.throws(
		() => testHierarchy.getSomeItems([ 'A', 'NonExistent', 'B' ]),
		/Node with ID 'NonExistent' not found in hierarchy/,
	);
});

test('hierarchy.getSomeItems() with empty array returns empty array', () => {
	const items = testHierarchy.getSomeItems([]);
	expect(items).toEqual([]);
});

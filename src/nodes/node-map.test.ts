import { type MultiMapSeparators } from '@loken/utilities';
import { expect, test } from 'vitest';

import { Nodes } from './nodes.js';
import type { Relation } from '../relations/relation.types.js';


const sep: MultiMapSeparators = {
	entry:  '\n\t',
	prefix: '\n\t',
};

const roots = [
	Nodes.create(-1),
	Nodes.create(0).attach([
		Nodes.create(1).attach([
			Nodes.create(11),
			Nodes.create(12).attach(Nodes.create(121)),
		]),
		Nodes.create(2),
		Nodes.create(3).attach(Nodes.create(31, 32)),
	]),
];


test('Nodes.toChildMap', () => {
	const expected = `
	-1
	0:1,2,3
	1:11,12
	3:31,32
	12:121`;

	const actual = Nodes.toChildMap(roots).render(sep);

	expect(actual).toEqual(expected);
});

test('Nodes.toDescendantMap', () => {
	const expected = `
	-1
	0:1,2,3,11,12,31,32,121
	1:11,12,121
	3:31,32
	12:121`;

	const actual = Nodes.toDescendantMap(roots).render(sep);

	expect(actual).toEqual(expected);
});

test('Nodes.toAncestorMap', () => {
	const expected = `
	-1
	1:0
	2:0
	3:0
	11:1,0
	12:1,0
	31:3,0
	32:3,0
	121:12,1,0`;

	const actual = Nodes.toAncestorMap(roots).render(sep);

	expect(actual).toEqual(expected);
});

test('Nodes.toRelations', () => {
	const expected: Relation<number>[] = [
		[ -1 ],
		[ 0, 1 ],
		[ 0, 2 ],
		[ 0, 3 ],
		[ 1, 11 ],
		[ 1, 12 ],
		[ 3, 31 ],
		[ 3, 32 ],
		[ 12, 121 ],
	];

	const actual = Nodes.toRelations(roots);

	expect(actual).toEqual(expected);
});

test('Nodes.fromRelations', () => {
	const relations: Relation<number>[] = [
		[ -1 ],
		[ 0, 1 ],
		[ 0, 2 ],
		[ 0, 3 ],
		[ 1, 11 ],
		[ 1, 12 ],
		[ 3, 31 ],
		[ 3, 32 ],
		[ 12, 121 ],
	];

	const actualRoots = Nodes.fromRelations(relations);

	// Should have 2 roots: -1 (isolated) and 0 (tree root)
	expect(actualRoots).toHaveLength(2);

	// Find the isolated root (-1)
	const isolatedRoot = actualRoots.find(root => root.item === -1);
	expect(isolatedRoot).toBeDefined();
	expect(isolatedRoot!.isLeaf).toBe(true);
	expect(isolatedRoot!.isRoot).toBe(true);

	// Find the tree root (0)
	const treeRoot = actualRoots.find(root => root.item === 0);
	expect(treeRoot).toBeDefined();
	expect(treeRoot!.isRoot).toBe(true);
	expect(treeRoot!.getChildren()).toHaveLength(3);

	// Verify the structure matches our original test data
	const childMap = Nodes.toChildMap(actualRoots);
	const expectedChildMap = Nodes.toChildMap(roots);
	expect(childMap).toEqual(expectedChildMap);
});

test('Nodes.toRelations -> fromRelations round-trip', () => {
	const relations = Nodes.toRelations(roots);
	const roundTripRoots = Nodes.fromRelations(relations);

	// Verify structure is preserved
	const originalChildMap = Nodes.toChildMap(roots);
	const roundTripChildMap = Nodes.toChildMap(roundTripRoots);

	expect(roundTripChildMap).toEqual(originalChildMap);
});

test('Nodes.fromRelations -> toRelations round-trip', () => {
	const originalRelations: Relation<number>[] = [
		[ -1 ],
		[ 0, 1 ],
		[ 0, 2 ],
		[ 0, 3 ],
		[ 1, 11 ],
		[ 1, 12 ],
		[ 3, 31 ],
		[ 3, 32 ],
		[ 12, 121 ],
	];

	const nodes = Nodes.fromRelations(originalRelations);
	const roundTripRelations = Nodes.toRelations(nodes);

	expect(roundTripRelations).toEqual(originalRelations);
});

import { MultiMap, type MultiMapSeparators } from '@loken/utilities';
import { expect, test } from 'vitest';

import type { Relation } from '../relations/relation.types.js';
import { childMapToParentMap, childMapToDescendantMap, childMapToAncestorMap, childMapToRelations, childMapToRootIds } from './maps-to.js';
import { relationsToChildMap } from '../relations/relations-to.js';

const sep: MultiMapSeparators = {
	entry:  '\n\t',
	prefix: '\n\t',
};

const childMap = MultiMap.parse(`
-1
0:1,2,3
1:11,12
3:31,32
12:121`, { transform: parseInt });


test('childMapToParentMap', () => {
	const expected = new Map<number, number | undefined>();
	expected.set(-1, undefined);
	expected.set(1, 0);
	expected.set(2, 0);
	expected.set(3, 0);
	expected.set(11, 1);
	expected.set(12, 1);
	expected.set(31, 3);
	expected.set(32, 3);
	expected.set(121, 12);

	const actual = childMapToParentMap(childMap);

	expect(actual).toEqual(expected);
});

test('childMapToDescendantMap', () => {
	const expected = `
	-1
	0:1,2,3,11,12,31,32,121
	1:11,12,121
	3:31,32
	12:121`;

	const actual = childMapToDescendantMap(childMap).render(sep);

	expect(actual).toEqual(expected);
});

test('childMapToAncestorMap', () => {
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

	const actual = childMapToAncestorMap(childMap).render(sep);

	expect(actual).toEqual(expected);
});


test('childMapToRelations', () => {
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

	const actual = childMapToRelations(childMap);

	expect(actual).toEqual(expected);
});

test('childMapToRelations -> relationsToChildMap round-trip', () => {
	const relations = childMapToRelations(childMap);
	const roundTripChildMap = relationsToChildMap(relations);

	expect(roundTripChildMap).toEqual(childMap);
});

test('childMapToRootIds', () => {
	const expected = new Set([ -1, 0 ]);
	const actual = childMapToRootIds(childMap);

	expect(actual).toEqual(expected);
});

test('childMapToRootIds with empty map', () => {
	const emptyMap = new MultiMap<number>();
	const actual = childMapToRootIds(emptyMap);

	expect(actual).toEqual(new Set());
});

test('childMapToRootIds with single isolated node', () => {
	const singleNodeMap = new MultiMap<number>();
	singleNodeMap.addEmpty(42);
	const actual = childMapToRootIds(singleNodeMap);

	expect(actual).toEqual(new Set([ 42 ]));
});

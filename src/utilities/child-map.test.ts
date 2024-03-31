import { MultiMap, type MultiMapSeparators } from '@loken/utilities';
import { expect, test } from 'vitest';

import { ChildMap } from './child-map.js';

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


test('ChildMap.toParentMap', () => {
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

	const actual = ChildMap.toParentMap(childMap);

	expect(actual).toEqual(expected);
});

test('ChildMap.toDescendantMap', () => {
	const expected = `
	-1
	0:1,2,3,11,12,31,32,121
	1:11,12,121
	3:31,32
	12:121`;

	const actual = ChildMap.toDescendantMap(childMap).render(sep);

	expect(actual).toEqual(expected);
});

test('ChildMap.toAncestorMap', () => {
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

	const actual = ChildMap.toAncestorMap(childMap).render(sep);

	expect(actual).toEqual(expected);
});

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

test('ChildMap.fromPropertyIds', () => {
	const obj = {
		a: {},
		b: {
			b1: {},
		},
		c: {
			c1: true,
			c2: true,
			c3: false,
		},
		d: {
			d1: {},
			d2: {
				d21: {},
				d22: {},
				d23: 'ignore',
			},
		},
	};

	const expectedMap = MultiMap.parse(`
	a
	b:b1
	c:c1,c2
	d:d1,d2
	d2:d21,d22`, sep);

	const map = ChildMap.fromPropertyIds(obj, (_, val) => {
		if (typeof val === 'boolean')
			return val;

		return val !== 'ignore';
	});

	expect(map).toEqual(expectedMap);
});


test('ChildMap.fromParentIds', () => {
	interface Item {
		Id:        string;
		ParentId?: string;
	}
	const items = [
		{ Id: 'a' },
		{ Id: 'b' },
		{ Id: 'b1',  ParentId: 'b' },
		{ Id: 'c1',  ParentId: 'c' },
		{ Id: 'c2',  ParentId: 'c' },
		{ Id: 'd21', ParentId: 'd2' },
		{ Id: 'd22', ParentId: 'd2' },
		{ Id: 'd1',  ParentId: 'd' },
		{ Id: 'd2',  ParentId: 'd' },
		{ Id: 'd' },
		{ Id: 'c' },
	] as Item[];

	const expectedMap = MultiMap.parse(`
	a
	b:b1
	c:c1,c2
	d:d1,d2
	d2:d21,d22`, sep);

	const map = ChildMap.fromParentIds(items, item => item.Id, item => item.ParentId);

	expect(map).toEqual(expectedMap);
});

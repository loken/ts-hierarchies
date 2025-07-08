import { MultiMap, type MultiMapSeparators } from '@loken/utilities';
import { expect, test } from 'vitest';

import { ChildMap } from './child-map.js';


const sep: MultiMapSeparators = {
	entry:  '\n\t',
	prefix: '\n\t',
};


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

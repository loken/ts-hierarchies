import { MultiMap } from '@loken/utilities';
import { expect, test } from 'vitest';

import { Hierarchies } from './hierarchies.js';


const hc = Hierarchies.createWithIds(MultiMap.parse(`
A:A1,A2
A1:A11,A12
A2:A21
B:B1
B1:B12`));


test('hc.getAncestorIds() returns ancestry in order', () => {
	const ancestors = hc.getAncestorIds({ id: 'A12' });

	expect(ancestors).toEqual([ 'A12', 'A1', 'A' ]);
});

test('hc.getAncestorIds() with excludeSelf, excludes identified node', () => {
	const ancestors = hc.getAncestorIds({ id: 'A12', excludeSelf: true });

	expect(ancestors).toEqual([ 'A1', 'A' ]);
});

test('hc.getDescendantIds() returns descendants', () => {
	const descendants = hc.getDescendantIds({ id: 'A1' });

	expect(descendants).toEqual([ 'A1', 'A11', 'A12' ]);
});

test('hc.getDescendantIds() with excludeSelf, excludes identified node', () => {
	const descendants = hc.getDescendantIds({ id: 'A', excludeSelf: true });

	expect(descendants).toEqual([ 'A1', 'A2', 'A11', 'A12', 'A21' ]);
});

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
	const ancestors = hc.getAncestorIds('A12');

	expect(ancestors).toEqual([ 'A1', 'A' ]);
});

test('hc.getAncestorIds() with includeSelf returns ancestors including the target ID', () => {
	const ancestors = hc.getAncestorIds('A12', true);

	expect(ancestors).toEqual([ 'A12', 'A1', 'A' ]);
});


test('hc.getDescendantIds() returns descendants', () => {
	const descendants = hc.getDescendantIds('A');

	expect(descendants).toEqual([ 'A1', 'A2', 'A11', 'A12', 'A21' ]);
});

test('hc.getDescendantIds() with includeSelf returns descendants including the target ID', () => {
	const descendants = hc.getDescendantIds('A1', true);

	expect(descendants).toEqual([ 'A1', 'A11', 'A12' ]);
});

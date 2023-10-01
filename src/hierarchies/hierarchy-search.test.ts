import { MultiMap } from '@loken/utilities';
import { expect, test } from 'vitest';

import { Hierarchies } from './hierarchies.js';


const childMap = MultiMap.parse(`
A:A1,A2,A3
B:B1,B2
G:G1,G2,G3,G4,G5
G1:G11,G12
G2:G21,G22
`);

const items = [
	{ id: 'A',   Description: 'Alpha' },
	{ id: 'B',   Description: 'Beta' },
	{ id: 'G',   Description: 'Gamma' },
	{ id: 'A1',  Description: 'One' },
	{ id: 'A2',  Description: 'Two' },
	{ id: 'A3',  Description: 'Three' },
	{ id: 'B1',  Description: 'One' },
	{ id: 'B2',  Description: 'Two' },
	{ id: 'G1',  Description: 'One' },
	{ id: 'G2',  Description: 'Two' },
	{ id: 'G3',  Description: 'Three' },
	{ id: 'G4',  Description: 'Four' },
	{ id: 'G5',  Description: 'Five' },
	{ id: 'G11', Description: 'One' },
	{ id: 'G12', Description: 'Two' },
	{ id: 'G21', Description: 'One' },
	{ id: 'G22', Description: 'Two' },
];

const source = Hierarchies.createWithItems({
	items,
	identify: item => item.id,
	spec:     childMap,
});


test('search with a predicate returns matches, ancestors and descendants by default', () => {
	const searchExp = /\b(One|Beta)\b/;
	const result = source.search(({ item }) => searchExp.test(item.Description));

	const actual = result.toChildMap();
	const expected = MultiMap.parse(`
	A:A1
	B:B1,B2
	G:G1,G2
	G1:G11,G12
	G2:G21`);

	expect(actual).toEqual(expected);
});

test('search IDs returns matches, ancestors and descendants by default', () => {
	const result = source.search([ 'G2' ]);

	const actual = result.toChildMap();
	const expected = MultiMap.parse(`
	G:G2
	G2:G21,G22`);

	expect(actual).toEqual(expected);
});


test('search IDs can return matches only', () => {
	const result = source.search([ 'A', 'G', 'G2' ], {
		matches: true,
	});

	const actual = result.toChildMap();
	const expected = MultiMap.parse(`
	A
	G:G2`);

	expect(actual).toEqual(expected);
});

test('search IDs can return ancestors only', () => {
	const result = source.search([ 'A', 'G', 'G2' ], {
		ancestors: true,
	});

	const actual = result.toChildMap();
	const expected = MultiMap.parse(`G`);

	expect(actual).toEqual(expected);
});

test('search IDs can return descendants only', () => {
	const result = source.search([ 'A', 'G', 'G2' ], {
		descendants: true,
	});

	const actual = result.toChildMap();
	const expected = MultiMap.parse(`
	A1
	A2
	A3
	G1
	G2:G21,G22
	G1:G11,G12
	G3
	G4
	G5`);

	expect(actual).toEqual(expected);
});

test('search IDs can return ancestors and descendants without matches', () => {
	const result = source.search([ 'G2' ], {
		ancestors:   true,
		descendants: true,
	});

	const actual = result.toChildMap();
	const expected = MultiMap.parse(`
	G
	G21
	G22`);

	expect(actual).toEqual(expected);
});

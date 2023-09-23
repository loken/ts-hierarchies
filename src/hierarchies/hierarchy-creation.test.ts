import { MultiMap } from '@loken/utilities';
import { expect, test } from 'vitest';

import { type Relation } from '../utilities/relations.js';
import { Hierarchies } from './hierarchies.js';

const childMap = new MultiMap();
childMap.add('A',  [ 'A1', 'A2' ]);
childMap.add('A2', [ 'A21' ]);
childMap.add('B',  [ 'B1' ]);
childMap.add('B1', [ 'B11', 'B12', 'B13' ]);

const relations: Relation<string>[] = [
	[ 'A',  'A1'  ],
	[ 'A',  'A2'  ],
	[ 'B',  'B1'  ],
	[ 'A2', 'A21' ],
	[ 'B1', 'B11' ],
	[ 'B1', 'B12' ],
	[ 'B1', 'B13' ],
];

const items = [
	{ id: 'A'   },
	{ id: 'A1'  },
	{ id: 'A2'  },
	{ id: 'A21' },
	{ id: 'B'   },
	{ id: 'B1'  },
	{ id: 'B11' },
	{ id: 'B12' },
	{ id: 'B13' },
];

test('Hierarchies.createWithIds(relations)', () => {
	const hc = Hierarchies.createWithIds(relations);

	const actual = hc.toChildMap();

	expect(actual).toEqual(childMap);
});

test('Hierarchies.createWithIds(childMap)', () => {
	const hc = Hierarchies.createWithIds(childMap);

	const actual = hc.toChildMap();

	expect(actual).toEqual(childMap);
});

test('Hierarchies.createWithItems() from items and relations', () => {
	const hc = Hierarchies.createWithItems({
		items,
		identify: item => item.id,
		spec:     relations,
	});

	const actual = hc.toChildMap();

	expect(actual).toEqual(childMap);
});

test('Hierarchies.createWithItems() from items and a child-map', () => {
	const hc = Hierarchies.createWithItems({
		items,
		identify: item => item.id,
		spec:     relations,
	});

	const actual = hc.toRelations();

	expect(actual).toEqual(relations);
});

test('Hierarchies.createWithIds() from item hierarchy', () => {
	const itemHc = Hierarchies.createWithItems({
		items,
		identify: item => item.id,
		spec:     childMap,
	});

	const idHc = Hierarchies.createWithIds(itemHc);

	const actual = idHc.toRelations();

	expect(actual).toEqual(relations);
});

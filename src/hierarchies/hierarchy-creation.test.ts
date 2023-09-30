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

test('Hierarchies.createWithIds(otherHierarchy)', () => {
	const itemHc = Hierarchies.createWithItems({
		items,
		identify: item => item.id,
		spec:     childMap,
	});

	const idHc = Hierarchies.createWithIds(itemHc);

	const actual = idHc.toRelations();

	expect(actual).toEqual(relations);
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
		spec:     childMap,
	});

	const actual = hc.toRelations();

	expect(actual).toEqual(relations);
});

test('Hierarchies.createWithItems() from items with children', () => {
	type ItemWithChildren = {
		id: string,
		children?: ItemWithChildren[],
	}

	// Represents the same structure as the `relations`
	const itemsWithChildren: ItemWithChildren[] = [
		{
			id:       'A',
			children: [
				{ id: 'A1' },
				{ id: 'A2', children: [ { id: 'A21' } ] },
			],
		}, {
			id:       'B',
			children: [
				{
					id:       'B1',
					children: [
						{ id: 'B11' },
						{ id: 'B12' },
						{ id: 'B13' },
					],
				},
			],
		},
	];

	const hc = Hierarchies.createWithItems({
		items:    itemsWithChildren,
		identify: item => item.id,
		children: item => item.children,
	});

	const actual = hc.toRelations();

	expect(actual).toEqual(relations);
});

test('Hierarchies.createWithItems() from items with parents', () => {
	type ItemWithParent = {
		id: string,
		parent?: ItemWithParent,
	}

	// Clone the items into a map.
	const itemsWithParents = new Map<string, ItemWithParent>();
	for (const item of items)
		itemsWithParents.set(item.id, { id: item.id });

	// Set the parent references.
	for (const [ parentId, childId ] of relations) {
		const parent = itemsWithParents.get(parentId)!;
		const child = itemsWithParents.get(childId)!;
		child.parent = parent;
	}

	const hc = Hierarchies.createWithItems({
		items:    itemsWithParents.values(),
		identify: item => item.id,
		parent:   item => item.parent,
	});

	const actual = hc.toRelations();

	expect(actual).toEqual(relations);
});

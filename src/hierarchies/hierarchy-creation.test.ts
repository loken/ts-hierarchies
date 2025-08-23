import { MultiMap } from '@loken/utilities';
import { expect, test } from 'vitest';

import { type Relation } from '../relations/relation.types.js';
import { Hierarchy } from './hierarchy.js';
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

test('Hierarchies.fromRelations(relations)', () => {
	const hc = Hierarchies.fromRelations(relations);

	const actual = hc.toChildMap();

	expect(actual).toEqual(childMap);
});

test('Hierarchies.fromRelationsWithItems() from items and relations', () => {
	const hc = Hierarchies.fromRelationsWithItems(items, item => item.id, relations);

	const actual = hc.toChildMap();

	expect(actual).toEqual(childMap);
});

test('Hierarchies.fromChildMap(childMap)', () => {
	const hc = Hierarchies.fromChildMap(childMap);

	const actual = hc.toChildMap();

	expect(actual).toEqual(childMap);
});

test('Hierarchies.fromChildMapWithItems() from items and a child-map', () => {
	const hc = Hierarchies.fromChildMapWithItems(items, item => item.id, childMap);

	const actual = hc.toRelations();

	expect(actual).toEqual(relations);
});

test('Hierarchies.fromHierarchyWithItems(otherHierarchy)', () => {
	const otherHierarchy = Hierarchies.fromChildMap(childMap);

	const itemHc = Hierarchies.fromHierarchyWithItems(items, item => item.id, otherHierarchy);

	const actual = itemHc.toRelations();

	expect(actual).toEqual(relations);
});

test('Hierarchies.fromChildItems() from items with children', () => {
	interface ItemWithChildren {
		id:        string,
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

	const hc = Hierarchies.fromChildItems(itemsWithChildren, item => item.id, item => item.children);

	const actual = hc.toRelations();

	expect(actual).toEqual(relations);
});

test('Hierarchies.fromChildIds() from items with child-id delegate', () => {
	const hc = Hierarchies.fromChildIds(items, item => item.id, item => childMap.get(item.id) ? [ ...childMap.get(item.id)! ] : undefined);

	const actual = hc.toRelations();

	expect(actual).toEqual(relations);
});

test('Hierarchies.fromParentItems() from items with parents', () => {
	interface ItemWithParent {
		id:      string,
		parent?: ItemWithParent,
	}

	// Clone the items into a map.
	const itemsWithParents = new Map<string, ItemWithParent>();
	for (const item of items)
		itemsWithParents.set(item.id, { id: item.id });

	// Set the parent references.
	for (const [ parentId, childId ] of relations) {
		if (childId === undefined)
			continue;

		const parent = itemsWithParents.get(parentId)!;
		const child = itemsWithParents.get(childId)!;
		child.parent = parent;
	}

	/* Ensure we can pass it all of the items. */
	const hcFromAll = Hierarchies.fromParentItems([ ...itemsWithParents.values() ], item => item.id, item => item.parent);

	const actualFromAll = hcFromAll.toRelations();
	expect(actualFromAll).toEqual(relations);


	/* Ensure we can pass it the leaf items only. */
	const hcFromLeaves = Hierarchies.fromParentItems(hcFromAll.findItems(node => node.isLeaf), item => item.id, item => item.parent);

	const actualFromLeaves = hcFromLeaves.toRelations();
	expect(actualFromLeaves).toEqual(relations);
});

test('Hierarchies.fromParentIds() from items with parent-id delegate', () => {
	const parentByChild = new Map<string, string>();
	for (const [ parentId, childId ] of relations) {
		if (childId)
			parentByChild.set(childId, parentId);
	}

	const hc = Hierarchies.fromParentIds(items, item => item.id, item => parentByChild.get(item.id));

	const actual = hc.toRelations();

	expect(actual).toEqual(relations);
});

test('Hierarchy.clone() with item hierarchy preserves items', () => {
	// Create hierarchy with complex items
	const complexItems = [
		{ id: 'A', name: 'Item A', value: 100 },
		{ id: 'A1', name: 'Item A1', value: 50 },
		{ id: 'A2', name: 'Item A2', value: 75 },
		{ id: 'B', name: 'Item B', value: 200 },
	];

	const childMap = new MultiMap<string>();
	childMap.add('A', [ 'A1', 'A2' ]);

	const originalWithItems = Hierarchies.fromChildMapWithItems(complexItems, item => item.id, childMap);

	// Clone it
	const cloneWithItems = Hierarchy.clone(originalWithItems);

	// Verify all items are preserved
	expect(cloneWithItems.nodeItems).toEqual(originalWithItems.nodeItems);

	// Verify nodes are new but items are same references
	const originalItem = originalWithItems.get('A').item;
	const clonedItem = cloneWithItems.get('A').item;
	expect(originalItem).toBe(clonedItem); // Same item reference
});

test('Hierarchy.cloneIds() creates ID hierarchy from item hierarchy', () => {
	// Create hierarchy with complex items
	const originalItems = [
		{ id: 'A', name: 'Root A' },
		{ id: 'A1', name: 'Child A1' },
		{ id: 'A2', name: 'Child A2' },
		{ id: 'B', name: 'Root B' },
	];

	const originalWithItems = Hierarchies.fromRelationsWithItems(originalItems, item => item.id, [
		[ 'A', 'A1' ],
		[ 'A', 'A2' ],
	]);

	// Clone to ID hierarchy
	const idClone = Hierarchy.cloneIds(originalWithItems);

	// Verify structure is identical
	expect(idClone.toChildMap()).toEqual(originalWithItems.toChildMap());

	// Verify root structure
	expect(idClone.roots.length).toBe(originalWithItems.roots.length);
	expect(idClone.rootItems).toEqual(originalWithItems.rootIds);

	// Verify all IDs are preserved
	expect(idClone.nodeItems).toEqual(originalWithItems.nodeIds);

	// Verify nodes are new instances
	const originalItem = originalWithItems.get('A');
	const clonedId = idClone.get('A');
	expect(originalItem).not.toBe(clonedId); // Different node instances
	expect(originalItem.item.id).toBe(clonedId.item); // Item's ID becomes the cloned item
});

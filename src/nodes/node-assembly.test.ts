import { MultiMap, type MultiMapSeparators, splitBy } from '@loken/utilities';
import { expect, test } from 'vitest';

import { Nodes } from './nodes.js';


const sep: MultiMapSeparators = {
	entry:  '\n',
	prefix: '\n',
};

const input = `
A:A1,A2
B:B1
C
A1:A11,A12
B1:B12`;


test('Assemble IDs', () => {
	const roots = Nodes.assembleIds(MultiMap.parse(input));

	const output = Nodes.toChildMap(roots, id => id).render(sep);

	expect(output).toEqual(input);
});

test('Assemble property IDs', () => {
	const roots = Nodes.assemblePropertyIds({
		A: {
			A1: {
				A11: true,
				A12: true,
			},
			A2: {},
		},
		B: {
			B1: {
				B12: true,
			},
		},
		C:       {},
		IGNORED: 'No match for include fn',
	}, (_, val) => typeof val === 'object' || val === true);

	const output = Nodes.toChildMap(roots, id => id).render(sep);

	expect(output).toEqual(input);
});

test('Assemble items', () => {
	const items = splitBy('A,B,C,A1,A2,B1,A11,A12,B12').map(id => ({ id }));

	const roots = Nodes.assembleItems(items, item => item.id, MultiMap.parse(input));

	const output = Nodes.toChildMap(roots, item => item.id).render(sep);

	expect(output).toEqual(input);
});


test('Assemble items should ignore items that are not in the relationship spec', () => {
	const items = splitBy('A,B,C,A1,A2,B1,A11,A12,B12,IGNORED').map(id => ({ id }));

	const roots = Nodes.assembleItems(items, item => item.id, MultiMap.parse(input));

	const output = Nodes.toChildMap(roots, item => item.id).render(sep);

	expect(output).toEqual(input);
});


test('Nodes.assembleItemsWithChildren() from items with children', () => {
	interface ItemWithChildren {
		id:        string,
		children?: ItemWithChildren[],
	}

	// Represents the same structure as the `relations`
	const itemsWithChildren: ItemWithChildren[] = [
		{
			id:       'A',
			children: [
				{
					id:       'A1',
					children: [
						{ id: 'A11' },
						{ id: 'A12' },
					],
				},
				{ id: 'A2' },
			],
		},
		{
			id:       'B',
			children: [
				{
					id:       'B1',
					children: [ { id: 'B12' } ],
				},
			],
		},
		{
			id: 'C',
		},
	];

	const roots = Nodes.assembleItemsWithChildren(itemsWithChildren, item => item.children);

	const actual = Nodes.toChildMap(roots, item => item.id).render(sep);

	expect(actual).toEqual(input);
});


test('Hierarchies.createWithItems() from items with parents', () => {
	const childMap = MultiMap.parse(input);

	interface ItemWithParent {
		id:      string,
		parent?: ItemWithParent,
	}

	// Create a map of items.
	const itemsWithParents = new Map<string, ItemWithParent>();
	for (const id of childMap.getAll())
		itemsWithParents.set(id, { id });

	// Set the parent references.
	for (const [ parentId, childIds ] of childMap) {
		const parent = itemsWithParents.get(parentId)!;
		for (const childId of childIds) {
			const child = itemsWithParents.get(childId)!;
			child.parent ??= parent;
		}
	}

	/* Ensure we can pass it all of the items. */
	const allItems = [ ...itemsWithParents.values() ];
	const rootsFromAll = Nodes.assembleItemsWithParents(allItems, item => item.parent);

	const actualFromAll = Nodes.toChildMap(rootsFromAll, item => item.id);
	expect(actualFromAll).toEqual(childMap);

	/* Ensure we can pass it the leaf items only. */
	const leafItems = [ ...itemsWithParents.values().filter(item => !childMap.get(item.id)?.size) ];
	const rootsFromLeaves = Nodes.assembleItemsWithParents(leafItems, item => item.parent);

	const actualFromLeaves = Nodes.toChildMap(rootsFromLeaves, item => item.id);
	expect(actualFromLeaves).toEqual(childMap);
});

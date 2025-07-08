import { MultiMap, type MultiMapSeparators, splitBy } from '@loken/utilities';
import { expect, test } from 'vitest';

import { nodesToIds } from './node-conversion.js';
import { nodesFromItemsWithChildMap, nodesFromItemsWithChildren, nodesFromItemsWithParents } from './nodes-from-items.js';
import { nodesToChildMap } from './nodes-to.js';


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

const inputRoots = [ 'A', 'B', 'C' ];
const inputMap = MultiMap.parse<string>(input);


test('nodesFromItemsWithChildMap', () => {
	const items = splitBy('A,B,C,A1,A2,B1,A11,A12,B12').map(id => ({ id }));

	const roots = nodesFromItemsWithChildMap(items, item => item.id, inputMap);

	expect(inputRoots).toEqual(nodesToIds(roots, item => item.id));

	const output = nodesToChildMap(roots, item => item.id).render(sep);

	expect(output).toEqual(input);
});


test('nodesFromItemsWithChildMap ignores items that are not in the child map', () => {
	const items = splitBy('A,B,C,A1,A2,B1,A11,A12,B12,IGNORED').map(id => ({ id }));

	const roots = nodesFromItemsWithChildMap(items, item => item.id, inputMap);

	expect(inputRoots).toEqual(nodesToIds(roots, item => item.id));

	const output = nodesToChildMap(roots, item => item.id).render(sep);

	expect(output).toEqual(input);
});


test('nodesFromItemsWithChildren()', () => {
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

	const roots = nodesFromItemsWithChildren(itemsWithChildren, item => item.children);

	expect(inputRoots).toEqual(nodesToIds(roots, item => item.id));

	const actual = nodesToChildMap(roots, item => item.id).render(sep);

	expect(actual).toEqual(input);
});


test('nodesFromItemsWithParents()', () => {
	interface ItemWithParent {
		id:      string,
		parent?: ItemWithParent,
	}

	// Create a map of items.
	const itemsWithParents = new Map<string, ItemWithParent>();
	for (const id of inputMap.getAll())
		itemsWithParents.set(id, { id });

	// Set the parent references.
	for (const [ parentId, childIds ] of inputMap) {
		const parent = itemsWithParents.get(parentId)!;
		for (const childId of childIds) {
			const child = itemsWithParents.get(childId)!;
			child.parent ??= parent;
		}
	}

	/* Ensure we can pass it all of the items. */
	const allItems = [ ...itemsWithParents.values() ];
	const rootsFromAll = nodesFromItemsWithParents(allItems, item => item.parent);

	const actualFromAll = nodesToChildMap(rootsFromAll, item => item.id);
	expect(actualFromAll).toEqual(inputMap);

	/* Ensure we can pass it the leaf items only. */
	const leafItems = [ ...itemsWithParents.values().filter(item => !inputMap.get(item.id)?.size) ];
	const rootsFromLeaves = nodesFromItemsWithParents(leafItems, item => item.parent);

	const actualFromLeaves = nodesToChildMap(rootsFromLeaves, item => item.id);
	expect(actualFromLeaves).toEqual(inputMap);
});

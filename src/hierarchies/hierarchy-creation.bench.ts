import { randomInt } from '@loken/utilities';
import { bench, describe } from 'vitest';

import { Nodes } from '../nodes/nodes.js';
import { ChildMap } from '../utilities/child-map.js';


type ItemWithChildren<Id = string> = {
	id: Id,
	children?: ItemWithChildren<Id>[],
}

const seen = new Set<number>();
const manyItemsWithChildren: ItemWithChildren<number>[] = [];
ChildMap.generate<ItemWithChildren<number>>({
	count:  10_000,
	create: ({ ancestry }) => {
		let id: number;
		do
			id = randomInt(1_000_000, 99_999_999);
		while (seen.has(id));
		seen.add(id);

		const item = { id, children: [] } as ItemWithChildren<number>;
		if (ancestry.length === 0)
			manyItemsWithChildren.push(item);
		else
			ancestry.at(-1)!.children!.push(item);

		return item;
	},
});


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

describe.skip('assembleItemsWithChildren (few)', () => {
	const start = performance.now();
	Nodes.assembleItemsWithChildren(itemsWithChildren, item => item.children);
	const stop = performance.now();
	console.log(`One iteration takes ${ stop - start } milliseconds`);

	bench('new', () => {
		Nodes.assembleItemsWithChildren(itemsWithChildren, item => item.children);
	});

	bench('old', () => {
		Nodes.assembleItemsWithChildrenOld(itemsWithChildren, item => item.children);
	});
});

describe('assembleItemsWithChildren (many)', () => {
	console.log(`Many items ${ manyItemsWithChildren.length } | ${ seen.size }`);
	const start = performance.now();
	Nodes.assembleItemsWithChildren(manyItemsWithChildren, item => item.children);
	const stop = performance.now();
	console.log(`One iteration takes ${ stop - start } milliseconds`);


	bench('new', () => {
		Nodes.assembleItemsWithChildren(manyItemsWithChildren, item => item.children);
	});

	bench('old', () => {
		Nodes.assembleItemsWithChildrenOld(manyItemsWithChildren, item => item.children);
	});
});


// Conclusion: New version is a ~5-15% performance hit - not worth it.

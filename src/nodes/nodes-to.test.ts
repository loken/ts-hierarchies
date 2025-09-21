import { type MultiMapSeparators } from '@loken/utilities';
import { expect, test } from 'vitest';

import { Nodes } from './nodes.js';
import type { Relation } from '../relations/relation.types.js';
import { nodesToChildMap, nodesToDescendantMap, nodesToAncestorMap, nodesToRelations } from './nodes-to.js';
import { relationsToNodes } from '../relations/relations-to.js';


const sep: MultiMapSeparators = {
	entry:  '\n\t',
	prefix: '\n\t',
};

const roots = [
	Nodes.create(-1),
	Nodes.create(0).attach([
		Nodes.create(1).attach([
			Nodes.create(11),
			Nodes.create(12).attach(Nodes.create(121)),
		]),
		Nodes.create(2),
		Nodes.create(3).attach(Nodes.create(31, 32)),
	]),
];


test('nodesToChildMap', () => {
	const expected = `
	-1
	0:1,2,3
	1:11,12
	3:31,32
	12:121`;

	const actual = nodesToChildMap(roots).render(sep);

	expect(actual).toEqual(expected);
});

test('nodesToDescendantMap', () => {
	const expected = `
	-1
	0:1,2,3,11,12,31,32,121
	1:11,12,121
	3:31,32
	12:121`;

	const actual = nodesToDescendantMap(roots).render(sep);

	expect(actual).toEqual(expected);
});

test('nodesToAncestorMap', () => {
	const expected = `
	-1
	1:0
	2:0
	3:0
	11:1,0
	12:1,0
	31:3,0
	32:3,0
	121:12,1,0`;

	const actual = nodesToAncestorMap(roots).render(sep);

	expect(actual).toEqual(expected);
});

test('nodesToRelations', () => {
	const expected: Relation<number>[] = [
		[ -1 ],
		[ 0, 1 ],
		[ 0, 2 ],
		[ 0, 3 ],
		[ 1, 11 ],
		[ 1, 12 ],
		[ 3, 31 ],
		[ 3, 32 ],
		[ 12, 121 ],
	];

	const actual = nodesToRelations(roots);

	expect(actual).toEqual(expected);
});

test('nodesToRelations -> relationsToNodes round-trip', () => {
	const relations      = nodesToRelations(roots);
	const roundTripRoots = relationsToNodes(relations);

	// Verify structure is preserved by comparing descendant items
	const originalItems  = Nodes.getDescendants(roots,          'with-self').map(n => n.item).sort();
	const roundTripItems = Nodes.getDescendants(roundTripRoots, 'with-self').map(n => n.item).sort();

	expect(roundTripItems).toEqual(originalItems);
});

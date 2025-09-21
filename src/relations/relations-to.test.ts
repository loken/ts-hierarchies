import { expect, test } from 'vitest';
import { Nodes } from '../nodes/nodes.js';
import type { Relation } from './relation.types.js';
import { relationsToChildMap, relationsToNodes } from './relations-to.js';
import { nodesToRelations } from '../nodes/nodes-to.js';
import { childMapToRelations } from '../maps/maps-to.js';
import { MultiMap } from '@loken/utilities';


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

const relations: Relation<number>[] = [
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

const childMap = MultiMap.parse(`
-1
0:1,2,3
1:11,12
3:31,32
12:121`, { transform: parseInt });


test('relationsToNodes', () => {
	const actualRoots = relationsToNodes(relations);

	const expectedIds = Nodes.getDescendants(roots).map(n => n.item);
	const actualIds = Nodes.getDescendants(actualRoots).map(n => n.item);
	expect(actualIds).toEqual(expectedIds);
});

test('relationsToChildMap', () => {
	const actual = relationsToChildMap(relations);

	expect(actual).toEqual(childMap);
});

test('relationsToNodes -> nodesToRelations round-trip', () => {
	const nodes = relationsToNodes(relations);
	const roundTripRelations = nodesToRelations(nodes);

	expect(roundTripRelations).toEqual(relations);
});

test('relationsToChildMap -> childMapToRelations round-trip', () => {
	const childMapFromRelations = relationsToChildMap(relations);
	const roundTripRelations = childMapToRelations(childMapFromRelations);

	expect(roundTripRelations).toEqual(relations);
});

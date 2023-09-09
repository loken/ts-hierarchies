import { type MultiMapSeparators } from '@loken/utilities';
import { expect, test } from 'vitest';

import { HCNode } from './node.js';
import { Nodes } from './nodes.js';


const sep: MultiMapSeparators = {
	entry:  '\n\t',
	prefix: '\n\t',
};

const root = new HCNode(0).attach([
	new HCNode(1).attach([
		new HCNode(11),
		new HCNode(12).attach(new HCNode(121)),
	]),
	new HCNode(2),
	new HCNode(3).attach([
		new HCNode(31),
		new HCNode(32),
	]),
]);


test('Nodes.toChildMap', () => {
	const expected = `
	0:1,2,3
	1:11,12
	3:31,32
	12:121`;

	const actual = Nodes.toChildMap(root).render(sep);

	expect(actual).toEqual(expected);
});

test('Nodes.toDescendantMap', () => {
	const expected = `
	0:1,2,3,11,12,31,32,121
	1:11,12,121
	3:31,32
	12:121`;

	const actual = Nodes.toDescendantMap(root).render(sep);

	expect(actual).toEqual(expected);
});

test('Nodes.toAncestorMap', () => {
	const expected = `
	1:0
	2:0
	3:0
	11:1,0
	12:1,0
	31:3,0
	32:3,0
	121:12,1,0`;

	const actual = Nodes.toAncestorMap(root).render(sep);

	expect(actual).toEqual(expected);
});

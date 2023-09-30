import { type MultiMapSeparators } from '@loken/utilities';
import { expect, test } from 'vitest';

import { Nodes } from './nodes.js';


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


test('Nodes.toChildMap', () => {
	const expected = `
	-1
	0:1,2,3
	1:11,12
	3:31,32
	12:121`;

	const actual = Nodes.toChildMap(roots).render(sep);

	expect(actual).toEqual(expected);
});

test('Nodes.toDescendantMap', () => {
	const expected = `
	-1
	0:1,2,3,11,12,31,32,121
	1:11,12,121
	3:31,32
	12:121`;

	const actual = Nodes.toDescendantMap(roots).render(sep);

	expect(actual).toEqual(expected);
});

test('Nodes.toAncestorMap', () => {
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

	const actual = Nodes.toAncestorMap(roots).render(sep);

	expect(actual).toEqual(expected);
});

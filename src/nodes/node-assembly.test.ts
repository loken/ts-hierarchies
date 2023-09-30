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

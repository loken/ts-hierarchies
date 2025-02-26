import { MultiMap } from '@loken/utilities';
import { test, expect } from 'vitest';
import { Nodes } from './nodes.ts';


const input = `
A:A1,A2
B:B1
C
A1:A11,A12
B1:B12`;


test('Nodes.findCommonAncestor() returns the closest common ancestor', () => {
	const roots = Nodes.assembleIds(MultiMap.parse(input));
	const nodes = Nodes.findDescendants(roots, n => n.item == 'A11' || n.item == 'A2');

	const expected = Nodes.findDescendant(roots, n => n.item === 'A', true);
	const actual = Nodes.findCommonAncestor(nodes);

	expect(actual).toBe(expected);
});

test('Nodes.findCommonAncestor() returns undefined when there is no common ancestor', () => {
	const roots = Nodes.assembleIds(MultiMap.parse(input));
	const nodes = Nodes.findDescendants(roots, n => n.item == 'A1' || n.item == 'B1');

	const actual = Nodes.findCommonAncestor(nodes);

	expect(actual).toBeUndefined();
});

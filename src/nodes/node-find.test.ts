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
	const roots = Nodes.fromChildMap(MultiMap.parse(input));
	const nodes = Nodes.findDescendants(roots, n => n.item == 'A11' || n.item == 'A2');

	const expected = Nodes.findDescendant(roots, n => n.item === 'A', true);
	const actual = Nodes.findCommonAncestor(nodes);

	expect(actual).toBe(expected);
});

test('Nodes.findCommonAncestor() returns undefined when there is no common ancestor', () => {
	const roots = Nodes.fromChildMap(MultiMap.parse(input));
	const nodes = Nodes.findDescendants(roots, n => n.item == 'A1' || n.item == 'B1');

	const actual = Nodes.findCommonAncestor(nodes, true);

	expect(actual).toBeUndefined();
});

test('Nodes.getAncestors()', () => {
	const roots = Nodes.fromChildMap(MultiMap.parse(input));
	const nodes = Nodes.findDescendants(roots, n => [ 'A11', 'A12', 'B1' ].includes(n.item));
	const nodeItems = nodes.map(n => n.item);
	// We find B1 first because we're doing a breadth-first search.
	expect(nodeItems).to.have.ordered.members([ 'B1', 'A11', 'A12' ]);

	// Since B1 is the first node we find its ancestor B first.
	// Since A1 is next, we find all of its ancestors next.
	// We finally find A12, whose ancestors have already been found, and are not repeated.
	const expected = [ 'B1', 'B', 'A11', 'A1', 'A', 'A12' ];
	const actual = Nodes.getAncestorItems(nodes, true);

	expect(actual).to.have.ordered.members(expected);
});

test('Nodes.findAncestors()', () => {
	const roots = Nodes.fromChildMap(MultiMap.parse(input));
	const nodes = Nodes.findDescendants(roots, n => [ 'A11', 'A12', 'B1' ].includes(n.item));
	const nodeItems = nodes.map(n => n.item);
	// We find B1 first because we're doing a breadth-first search.
	expect(nodeItems).to.have.ordered.members([ 'B1', 'A11', 'A12' ]);

	// Since B1 is the first node we find its ancestor B first.
	// Since A1 is next, we find all of its ancestors next.
	// We find A12, whose ancestors have already been found, and are not repeated.
	const expected = [ 'B', 'A1', 'A', 'A12' ];
	const actual = Nodes.findAncestors(nodes, node => expected.includes(node.item), true).map(n => n.item);

	expect(actual).to.have.ordered.members(expected);
});

import { expect, test } from 'vitest';

import { Nodes } from '../nodes/nodes.js';
import { searchGraph, searchGraphMany } from './graph-search.js';


const intRoot = Nodes.create(0).attach([
	Nodes.create(1).attach([
		Nodes.create(11),
		Nodes.create(12).attach(Nodes.create(121)),
	]),
	Nodes.create(2),
	Nodes.create(3).attach(Nodes.create(31, 32)),
]);

test('searchGraph (next, breadth-first) finds first leaf (2)', () => {
	const match = searchGraph({
		type:   'breadth-first',
		roots:  intRoot,
		next:   n => n.children,
		search: n => n.isLeaf,
	});

	expect(match?.item).toEqual(2);
});

test('searchGraph (next, depth-first) finds first leaf (32)', () => {
	const match = searchGraph({
		type:   'depth-first',
		roots:  intRoot,
		next:   n => n.children,
		search: n => n.isLeaf,
	});

	expect(match?.item).toEqual(32);
});

test('searchGraphMany (next, breadth-first) finds all leaves in order', () => {
	const matches = searchGraphMany({
		type:   'breadth-first',
		roots:  intRoot,
		next:   n => n.children,
		search: n => n.isLeaf,
	}).map(n => n.item);

	const expected = [ 2, 11, 31, 32, 121 ];
	expect(matches).toEqual(expected);
});

test('searchGraphMany (next, depth-first) finds all leaves in order', () => {
	const matches = searchGraphMany({
		type:   'depth-first',
		roots:  intRoot,
		next:   n => n.children,
		search: n => n.isLeaf,
	}).map(n => n.item);

	const expected = [ 32, 31, 2, 121, 11 ];
	expect(matches).toEqual(expected);
});

test('searchGraph (next) on circular graph with detectCycles finds target', () => {
	const last = Nodes.create(4);
	const first = Nodes.create(1).attach(
		Nodes.create(2).attach(
			Nodes.create(3).attach(last),
		),
	);

	// Make it circular!
	last.attach(first);

	const match = searchGraph({
		roots:        first,
		detectCycles: true,
		next:         node => node.children,
		search:       node => node.item === 4,
	});

	expect(match?.item).toEqual(4);
});

test('searchGraphMany (next) on circular graph with detectCycles returns all', () => {
	const last = Nodes.create(4);
	const first = Nodes.create(1).attach(
		Nodes.create(2).attach(
			Nodes.create(3).attach(last),
		),
	);

	// Make it circular!
	last.attach(first);

	const matches = searchGraphMany({
		roots:        first,
		detectCycles: true,
		next:         node => node.children,
		search:       () => true,
	}).map(n => n.item);

	expect(matches).toEqual([ 1, 2, 3, 4 ]);
});

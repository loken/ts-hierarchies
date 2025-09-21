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
		roots:   intRoot,
		descend: 'breadth-first',
		next:    n => n.children,
		search:  n => n.isLeaf,
	});

	expect(match?.item).toEqual(2);
});

test('searchGraph (next, depth-first) finds first leaf (32)', () => {
	const match = searchGraph({
		roots:   intRoot,
		descend: 'depth-first',
		next:    n => n.children,
		search:  n => n.isLeaf,
	});

	expect(match?.item).toEqual(32);
});

test('searchGraphMany (next, breadth-first) finds all leaves in order', () => {
	const matches = searchGraphMany({
		roots:   intRoot,
		descend: 'breadth-first',
		next:    n => n.children,
		search:  n => n.isLeaf,
	}).map(n => n.item);

	const expected = [ 2, 11, 31, 32, 121 ];
	expect(matches).toEqual(expected);
});

test('searchGraphMany (next, depth-first) finds all leaves in order', () => {
	const matches = searchGraphMany({
		roots:   intRoot,
		descend: 'depth-first',
		next:    n => n.children,
		search:  n => n.isLeaf,
	}).map(n => n.item);

	const expected = [ 32, 31, 2, 121, 11 ];
	expect(matches).toEqual(expected);
});

test('searchGraph (next, includeSelf=false) skips root when matching root', () => {
	const match = searchGraph({
		roots:   intRoot,
		descend: { includeSelf: false },
		next:    n => n.children,
		search:  n => n.item === 0, // root only
	});

	expect(match).toBeUndefined();
});

test('searchGraph (next, includeSelf=false) finds descendant', () => {
	const match = searchGraph({
		roots:   intRoot,
		descend: { includeSelf: false, type: 'breadth-first' },
		next:    n => n.children,
		search:  n => n.item === 2, // first leaf child after skipping root
	});

	expect(match?.item).toEqual(2);
});

test('searchGraphMany (next, includeSelf=false) excludes root even if matching predicate', () => {
	const matches = searchGraphMany({
		roots:   intRoot,
		descend: { includeSelf: false, type: 'breadth-first' },
		next:    n => n.children,
		search:  () => true,
	}).map(n => n.item);

	// Root 0 should not be present
	expect(matches.includes(0)).toBe(false);
	// Other nodes should all be there (order breadth-first excluding root)
	const expected = [ 1, 2, 3, 11, 12, 31, 32, 121 ];
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
		roots:   first,
		descend: {
			detectCycles: true,
		},
		next:   node => node.children,
		search: node => node.item === 4,
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
		roots:   first,
		descend: {
			detectCycles: true,
		},
		next:   node => node.children,
		search: () => true,
	}).map(n => n.item);

	expect(matches).toEqual([ 1, 2, 3, 4 ]);
});

test('searchGraphMany (next reverse) orders siblings in reverse', () => {
	const matches = searchGraphMany({
		roots:   intRoot,
		descend: { siblingOrder: 'reverse' },
		next:    n => n.children,
		search:  () => true,
	}).map(n => n.item);

	const expected = [ 0, 3, 2, 1, 32, 31, 12, 11, 121 ];
	expect(matches).toEqual(expected);
});

test('searchGraphMany (next reverse, includeSelf=false) excludes root and reverses siblings', () => {
	const matches = searchGraphMany({
		roots:   intRoot,
		descend: { includeSelf: false, siblingOrder: 'reverse' },
		next:    n => n.children,
		search:  () => true,
	}).map(n => n.item);

	const expected = [ 3, 2, 1, 32, 31, 12, 11, 121 ];
	expect(matches).toEqual(expected);
});

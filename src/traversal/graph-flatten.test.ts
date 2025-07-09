import { expect, test } from 'vitest';

import { nodesToItems } from '../nodes/node-conversion.js';
import { Nodes } from '../nodes/nodes.js';
import { flattenGraph } from './graph-flatten.js';


const intRoot = Nodes.create(0).attach([
	Nodes.create(1).attach([
		Nodes.create(11),
		Nodes.create(12).attach(Nodes.create(121)),
	]),
	Nodes.create(2),
	Nodes.create(3).attach(Nodes.create(31, 32)),
]);

const strRoots = [
	Nodes.create('A').attach([
		Nodes.create('A1').attach(Nodes.create('A11', 'A12')),
		Nodes.create('A2').attach(Nodes.create('A21')),
	]),
	Nodes.create('B').attach(Nodes.create('B1').attach(Nodes.create('B12'))),
];


test('flattenGraph (next, breadth-first) yields in correct order', () => {
	const expected = [ 0, 1, 2, 3, 11, 12, 31, 32, 121 ];

	const actual = flattenGraph({
		type:  'breadth-first',
		roots: intRoot,
		next:  n => n.children,
	});

	expect(nodesToItems(actual)).toEqual(expected);
});

test('flattenGraph (next, depth-first) yields in correct order', () => {
	const expected = [ 0, 3, 32, 31, 2, 1, 12, 121, 11 ];

	const actual = flattenGraph({
		type:  'depth-first',
		roots: intRoot,
		next:  n => n.children,
	});

	expect(nodesToItems(actual)).toEqual(expected);
});

test('flattenGraph (signal, breadth-first) yields in correct order', () => {
	const expected = [ 0, 1, 2, 3, 11, 12, 31, 32, 121 ];

	const actual = flattenGraph({
		type:   'breadth-first',
		roots:  intRoot,
		signal: (n, s) => s.next(n.children),
	});

	expect(nodesToItems(actual)).toEqual(expected);
});

test('flattenGraph (signal, depth-first) yields in correct order', () => {
	const expected = [ 0, 3, 32, 31, 2, 1, 12, 121, 11 ];

	const actual = flattenGraph({
		type:   'depth-first',
		roots:  intRoot,
		signal: (n, s) => s.next(n.children),
	});

	expect(nodesToItems(actual)).toEqual(expected);
});

test('flattenGraph (signal) with skip yields in correct order', () => {
	const expected = [ 0, 1, 2, 3, 121 ];

	const actual = flattenGraph({
		roots:  intRoot,
		signal: (node, signal) => {
			// Exclude children of 3 which is 31 and 32.
			if (node.item !== 3)
				signal.next(node.children);

			// Skip children of 1 which is 11 and 12.
			if (node.parent?.item === 1)
				signal.skip();
		},
	});

	expect(nodesToItems(actual)).toEqual(expected);
});

test('flattenGraph (signal) with skip and end yields wanted node', () => {
	// Let's implement a search for a single node.
	const expected = 12;
	const actual = flattenGraph({
		roots:  intRoot,
		signal: (node, signal) => {
			signal.next(node.children);

			// We want to stop traversal once we find the item we want
			// and to skip every other item.
			if (node.item == expected)
				signal.end();
			else
				signal.skip();
		},
	});

	const items = nodesToItems(actual);

	expect(items.length).toEqual(1);
	expect(items[0]).toEqual(expected);
});

test('flattenGraph (next) on circular graph breaks on visited', () => {
	const last = Nodes.create(4);
	const first = Nodes.create(1).attach(
		Nodes.create(2).attach(
			Nodes.create(3).attach(last),
		),
	);

	// Make it circular!
	last.attach(first);

	const actual = flattenGraph({
		roots:        first,
		detectCycles: true,
		next:         node => node.children,
	});

	expect(nodesToItems(actual)).toEqual([ 1, 2, 3, 4 ]);
});

test('flattenGraph (signal) on circular graph breaks on visited', () => {
	const last = Nodes.create(4);
	const first = Nodes.create(1).attach(
		Nodes.create(2).attach(
			Nodes.create(3).attach(last),
		),
	);

	// Make it circular!
	last.attach(first);

	const actual = flattenGraph({
		roots:        first,
		detectCycles: true,
		signal:       (node, signal) => {
			signal.next(node.children);
		},
	});

	expect(nodesToItems(actual)).toEqual([ 1, 2, 3, 4 ]);
});


test('flattenGraph (signal, breadth-first) provides correct depth', () => {
	flattenGraph({
		type:   'breadth-first',
		roots:  strRoots,
		signal: (node, signal) => {
			signal.next(node.children);

			expect(node.item.length - 1).toEqual(signal.depth);
		},
	});
});

test('flattenGraph (signal, depth-first) provides correct depth', () => {
	flattenGraph({
		type:   'depth-first',
		roots:  strRoots,
		signal: (node, signal) => {
			signal.next(node.children);

			expect(node.item.length - 1).toEqual(signal.depth);
		},
	});
});

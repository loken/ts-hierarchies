import { iterateAll } from '@loken/utilities';
import { expect, test } from 'vitest';

import { Nodes } from '../nodes/nodes.js';
import { traverseGraph } from './graph-traverse.js';


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


test('traverseGraph (next, breadth-first) yields in correct order', () => {
	const expected = [ 0, 1, 2, 3, 11, 12, 31, 32, 121 ];

	const actual = traverseGraph({
		type:  'breadth-first',
		roots: intRoot,
		next:  n => n.children,
	}).map(n => n.item).toArray();

	expect(actual).toEqual(expected);
});

test('traverseGraph (next, depth-first) yields in correct order', () => {
	const expected = [ 0, 3, 32, 31, 2, 1, 12, 121, 11 ];

	const actual = traverseGraph({
		type:  'depth-first',
		roots: intRoot,
		next:  n => n.children,
	}).map(n => n.item).toArray();

	expect(actual).toEqual(expected);
});

test('traverseGraph (signal, breadth-first) yields in correct order', () => {
	const expected = [ 0, 1, 2, 3, 11, 12, 31, 32, 121 ];

	const actual = traverseGraph({
		type:   'breadth-first',
		roots:  intRoot,
		signal: (n, s) => s.next(n.children),
	}).map(n => n.item).toArray();

	expect(actual).toEqual(expected);
});

test('traverseGraph (signal, depth-first) yields in correct order', () => {
	const expected = [ 0, 3, 32, 31, 2, 1, 12, 121, 11 ];

	const actual = traverseGraph({
		type:   'depth-first',
		roots:  intRoot,
		signal: (n, s) => s.next(n.children),
	}).map(n => n.item).toArray();

	expect(actual).toEqual(expected);
});

test('traverseGraph (signal) with skip yields in correct order', () => {
	const expected = [ 0, 1, 2, 3, 121 ];

	const actual = traverseGraph({
		roots:  intRoot,
		signal: (node, signal) => {
			// Exclude children of 3 which is 31 and 32.
			if (node.item !== 3)
				signal.next(node.children);

			// Skip children of 1 which is 11 and 12.
			if (node.parent?.item === 1)
				signal.skip();
		},
	}).map(n => n.item).toArray();

	expect(actual).toEqual(expected);
});

test('traverseGraph (signal) with skip and end yields wanted node', () => {
	// Let's implement a search for a single node.
	const expected = 12;
	const actual = traverseGraph({
		roots:  intRoot,
		signal: (node, signal) => {
			signal.next(node.children);

			// We want to stop traversal once we find the item we want
			// and to skip every other item.
			if (node.item == expected)
				signal.stop();
			else
				signal.skip();
		},
	}).map(n => n.item).toArray();

	expect(actual.length).toEqual(1);
	expect(actual[0]).toEqual(expected);
});

test('traverseGraph (next) on circular graph breaks on visited', () => {
	const last = Nodes.create(4);
	const first = Nodes.create(1).attach(
		Nodes.create(2).attach(
			Nodes.create(3).attach(last),
		),
	);

	// Make it circular!
	last.attach(first);

	const actual = traverseGraph({
		roots:        first,
		detectCycles: true,
		next:         node => node.children,
	}).map(n => n.item).toArray();

	expect(actual).toEqual([ 1, 2, 3, 4 ]);
});

test('traverseGraph (signal) on circular graph breaks on visited', () => {
	const last = Nodes.create(4);
	const first = Nodes.create(1).attach(
		Nodes.create(2).attach(
			Nodes.create(3).attach(last),
		),
	);

	// Make it circular!
	last.attach(first);

	const actual = traverseGraph({
		roots:        first,
		detectCycles: true,
		signal:       (node, signal) => {
			signal.next(node.children);
		},
	}).map(n => n.item).toArray();

	expect(actual).toEqual([ 1, 2, 3, 4 ]);
});


test('traverseGraph (signal, breadth-first) provides correct depth', () => {
	const actual = traverseGraph({
		type:   'breadth-first',
		roots:  strRoots,
		signal: (node, signal) => {
			signal.next(node.children);

			expect(node.item.length - 1).toEqual(signal.depth);
		},
	});

	iterateAll(actual);
});

test('traverseGraph (signal, depth-first) provides correct depth', () => {
	const actual = traverseGraph({
		type:   'depth-first',
		roots:  strRoots,
		signal: (node, signal) => {
			signal.next(node.children);

			expect(node.item.length - 1).toEqual(signal.depth);
		},
	});

	iterateAll(actual);
});

test('traverseGraph (signal) throws when calling yield then skip', () => {
	const fn = (): void => {
		const it = traverseGraph({
			roots:  intRoot,
			signal: (_n, s) => {
				s.yield();
				s.skip();
			},
		});

		iterateAll(it);
	};

	expect(fn).toThrowError(/yield and skip are mutually exclusive/i);
});

test('traverseGraph (signal) throws when calling prune then next', () => {
	const fn = (): void => {
		const it = traverseGraph({
			roots:  intRoot,
			signal: (n, s) => {
				s.prune();
				s.next(n.children);
			},
		});

		iterateAll(it);
	};

	expect(fn).toThrowError(/prune and next are mutually exclusive/i);
});

import { iterateAll, MultiMap } from '@loken/utilities';
import { describe, expect, it } from 'vitest';

import { Node } from '../nodes/node.js';
import { nodesToItems } from '../nodes/node-conversion.js';
import { Nodes } from '../nodes/nodes.js';
import { traverseGraph } from './traverse-graph.js';


const root = new Node(0).attach([
	new Node(1).attach([
		new Node(11),
		new Node(12).attach(new Node(121)),
	]),
	new Node(2),
	new Node(3).attach([
		new Node(31),
		new Node(32),
	]),
]);

describe('traverseGraph', () => {
	it('should yield all items in correct order when traversing breadth-first using the `next` delegate', () => {
		const expected = [ 0, 1, 2, 3, 11, 12, 31, 32, 121 ];

		const actual = traverseGraph({
			type:  'breadth-first',
			roots: root,
			next:  n => n.children,
		});

		expect(nodesToItems(actual)).toEqual(expected);
	});

	it('should yield all items in correct order when traversing depth-first using the `next` delegate', () => {
		const expected = [ 0, 3, 32, 31, 2, 1, 12, 121, 11 ];

		const actual = traverseGraph({
			type:  'depth-first',
			roots: root,
			next:  n => n.children,
		});

		expect(nodesToItems(actual)).toEqual(expected);
	});

	it('should yield signaled items unless skipped when using the `signal` delegate', () => {
		const expected = [ 0, 1, 2, 3, 121 ];

		const actual = traverseGraph({
			roots:  root,
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

	it('should signal the correct depth during traversal', () => {
		const actual = traverseGraph({
			roots:  root,
			signal: (node, signal) => {
				signal.next(node.children);

				// Due to our value scheme the depth is equal to
				// the number of digits which we can get with a bit of math.
				const expectedDepth = node.item == 0 ? 0 : Math.floor(Math.log10(node.item) + 1);
				expect(expectedDepth).toEqual(signal.depth);
			},
		});

		iterateAll(actual);
	});

	it('should find node using `skip` and `end`', () => {
		// Let's implement a search for a single node.
		const expected = 12;
		const actual = traverseGraph({
			roots:  root,
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

		const node = [ ...actual ][0];

		expect(node?.item).toEqual(12);
	});

	it('should be able to break circular dependencies', () => {
		const last = new Node(4);
		const first = new Node(1).attach(
			new Node(2).attach(
				new Node(3).attach(last),
			),
		);

		// Make it circular!
		last.attach(first);

		const actual = traverseGraph({
			roots:        first,
			detectCycles: true,
			next:         node => node.children,
		});

		expect(nodesToItems(actual)).toEqual([ 1, 2, 3, 4 ]);
	});


	it('should signal the correct depth during breadth-first traversal', () => {
		const childMap = MultiMap.parse(`
		A:A1,A2
		A1:A11,A12
		A2:A21
		B:B1
		B1:B12
		`);

		const roots = Nodes.assembleIds(childMap);

		const actual = traverseGraph({
			type:   'breadth-first',
			roots,
			signal: (node, signal) => {
				signal.next(node.children);

				expect(node.item.length - 1).toEqual(signal.depth);
			},
		});

		iterateAll(actual);
	});

	it('should signal the correct depth during depth-first traversal', () => {
		const childMap = MultiMap.parse(`
		A:A1,A2
		A1:A11,A12
		A2:A21
		B:B1
		B1:B12
		`);

		const roots = Nodes.assembleIds(childMap);

		const actual = traverseGraph({
			type:   'depth-first',
			roots,
			signal: (node, signal) => {
				signal.next(node.children);

				expect(node.item.length - 1).toEqual(signal.depth);
			},
		});

		iterateAll(actual);
	});
});

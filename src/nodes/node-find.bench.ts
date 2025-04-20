import { bench, describe, expect } from 'vitest';
import { Nodes } from './nodes.ts';
import { MultiMap } from '@loken/utilities';
import { searchGraph } from '../traversal/search-graph.ts';
import { flattenGraph } from '../traversal/flatten-graph.ts';
import type { TraversalType } from '../traversal/traverse-types.ts';
import type { HCNode } from './node.ts';

const input = `
A:A1,A2,A3,A4,A5,A6,A7,A8,A9,A10
B:B1,B2,B3,B4,B5,B6,B7,B8,B9,B10
C
A1:A11,A12
A5:A51,A52,A53,A54,A55,A56,A57,A58,A59,A510
A6:A61,A62,A63,A64,A65,A66,A67,A68,A69,A610
B1:B12`;

const roots = Nodes.assembleIds(MultiMap.parse(input));
const type: TraversalType = 'depth-first';
const searchId = 'A66';
const search = (n: HCNode<string>) => n.item === searchId;

describe('Compare two possible ways to search a graph.', () => {
	// This is the current implementation of Nodes.findDescendant.
	// It uses a queue/stack to traverse the graph and find the node.
	bench('searchGraph', () => {
		const found = searchGraph({
			roots,
			next: node => node.getChildren(),
			search,
			type,
		});

		expect(found?.item).toBe(searchId);
	});

	// This is the older implementation of Nodes.findDescendant.
	// It uses a signal to traverse the graph and find the node.
	bench('flattenGraph', () => {
		const found = flattenGraph({
			roots,
			signal: (n, s) => {
				if (search(n)) {
					s.end();
				}
				else {
					s.skip();
					s.next(n.getChildren());
				}
			},
		})[0];

		expect(found?.item).toBe(searchId);
	});
});

import { bench, describe, expect } from 'vitest';
import { ChildMap } from '../utilities/child-map.ts';
import { Nodes } from '../nodes/nodes.ts';

import type { HCNode } from '../nodes/node.ts';
import { flattenFullGraph, flattenSignalGraph } from './graph-flatten.ts';
import { iterateAll } from '@loken/utilities';
import { traverseFullGraph, traverseSignalGraph } from './graph-traverse.ts';
import { searchGraph } from './graph-search.ts';


const counts = [ 1_000, 10_000, 100_000 ];

const infos = new Map<number, { roots: HCNode<string>[], searchId: string, searchDepth: number }>();
counts.forEach(count => {
	let searchDepth = -1;
	let searchId: string = '';
	const childMap = ChildMap.generate<string>({
		count,
		create: ({ ancestry, siblings }) => {
			const parentId = ancestry?.at(-1);
			const siblingId = siblings.length + 1;

			const id = parentId
				? parentId + '-' + siblingId
				: siblingId.toString();

			if (ancestry.length > searchDepth) {
				searchDepth = ancestry.length;
				searchId = id;
			}

			return id;
		},
	});

	infos.set(count, { roots: Nodes.assembleIds(childMap), searchId, searchDepth });
});

counts.forEach(count => {
	describe(`traverse graph of ${ count } nodes`, () => {
		const roots = infos.get(count)!.roots;

		bench('bf traverseFullGraph', () => {
			iterateAll(traverseFullGraph({
				roots,
				next: (node) => node.getChildren(),
				type: 'breadth-first',
			}));
		});

		bench('df traverseFullGraph', () => {
			iterateAll(traverseFullGraph({
				roots,
				next: (node) => node.getChildren(),
				type: 'depth-first',
			}));
		});

		bench('bf traverseSignalGraph', () => {
			iterateAll(traverseSignalGraph({
				roots,
				signal: (n, s) => s.next(n.getChildren()),
				type:   'breadth-first',
			}));
		});

		bench('df traverseSignalGraph', () => {
			iterateAll(traverseSignalGraph({
				roots,
				signal: (n, s) => s.next(n.getChildren()),
				type:   'depth-first',
			}));
		});


		bench('bf flattenFullGraph', () => {
			flattenFullGraph({
				roots,
				next: (node) => node.getChildren(),
				type: 'depth-first',
			});
		});

		bench('df flattenFullGraph', () => {
			flattenFullGraph({
				roots,
				next: (node) => node.getChildren(),
				type: 'breadth-first',
			});
		});

		bench('bf flattenSignalGraph', () => {
			flattenSignalGraph({
				roots,
				signal: (n, s) => s.next(n.getChildren()),
				type:   'breadth-first',
			});
		});

		bench('df flattenSignalGraph', () => {
			flattenSignalGraph({
				roots,
				signal: (n, s) => s.next(n.getChildren()),
				type:   'depth-first',
			});
		});
	});
});


counts.forEach(count => {
	describe(`search graph of ${ count } nodes`, () => {
		const { roots, searchId } = infos.get(count)!;
		const search = (node: HCNode<string>) => node.item === searchId;

		bench('searchGraph', () => {
			const found = searchGraph({
				roots: roots,
				next:  (node) => node.getChildren(),
				search,
			});

			expect(found?.item).toEqual(searchId);
		});

		bench('traverseSignalGraph', () => {
			const found = traverseSignalGraph({
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
			}).next()?.value;

			expect(found?.item).toEqual(searchId);
		});

		bench('flattenSignalGraph', () => {
			const found = flattenSignalGraph({
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

			expect(found?.item).toEqual(searchId);
		});
	});
});

import { bench, describe, expect } from 'vitest';
import { ChildMap } from '../maps/child-map.ts';
import { Nodes } from '../nodes/nodes.ts';

import type { HCNode } from '../nodes/node.ts';
import { flattenGraphNext, flattenGraphSignal } from './graph-flatten.ts';
import { iterateAll } from '@loken/utilities';
import { traverseGraphNext, traverseGraphSignal } from './graph-traverse.ts';
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

		bench('bf traverseGraphNext', () => {
			iterateAll(traverseGraphNext({
				roots,
				next: (node) => node.getChildren(),
				type: 'breadth-first',
			}));
		});

		bench('df traverseGraphNext', () => {
			iterateAll(traverseGraphNext({
				roots,
				next: (node) => node.getChildren(),
				type: 'depth-first',
			}));
		});

		bench('bf traverseGraphSignal', () => {
			iterateAll(traverseGraphSignal({
				roots,
				signal: (n, s) => s.next(n.getChildren()),
				type:   'breadth-first',
			}));
		});

		bench('df traverseGraphSignal', () => {
			iterateAll(traverseGraphSignal({
				roots,
				signal: (n, s) => s.next(n.getChildren()),
				type:   'depth-first',
			}));
		});


		bench('bf flattenGraphNext', () => {
			flattenGraphNext({
				roots,
				next: (node) => node.getChildren(),
				type: 'depth-first',
			});
		});

		bench('df flattenGraphNext', () => {
			flattenGraphNext({
				roots,
				next: (node) => node.getChildren(),
				type: 'breadth-first',
			});
		});

		bench('bf flattenGraphSignal', () => {
			flattenGraphSignal({
				roots,
				signal: (n, s) => s.next(n.getChildren()),
				type:   'breadth-first',
			});
		});

		bench('df flattenGraphSignal', () => {
			flattenGraphSignal({
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

		bench('traverseGraphSignal', () => {
			const found = traverseGraphSignal({
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

		bench('flattenGraphSignal', () => {
			const found = flattenGraphSignal({
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

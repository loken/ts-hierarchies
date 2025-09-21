import { bench, describe, expect } from 'vitest';

import { iterateAll, iterateSome, range } from '@loken/utilities';
import { traverseSequenceNext, traverseSequenceSignal } from './sequence-traverse.js';
import { flattenSequenceNext, flattenSequenceSignal } from './sequence-flatten.js';
import { searchSequence } from './sequence-search.js';

const counts = [ 1_000, 10_000, 100_000 ];


counts.forEach(count => {
	describe(`traverse sequence of ${ count } elements`, () => {
		const items = range(1, count);

		bench('traverseSequenceNext', () => {
			const iterator = iterateSome(items);

			iterateAll(traverseSequenceNext({
				first: iterator.next().value,
				next:  _ => iterator.next()?.value,
			}));
		});

		bench('traverseSequenceSignal', () => {
			const iterator = iterateSome(items);

			iterateAll(traverseSequenceSignal({
				first:  iterator.next().value,
				signal: (_, s) => s.next(iterator.next()?.value),
			}));
		});

		bench('flattenSequenceNext', () => {
			const iterator = iterateSome(items);

			flattenSequenceNext({
				first: iterator.next().value,
				next:  _ => iterator.next()?.value,
			});
		});

		bench('flattenSequenceSignal', () => {
			const iterator = iterateSome(items);

			flattenSequenceSignal({
				first:  iterator.next().value,
				signal: (_, s) => s.next(iterator.next()?.value),
			});
		});
	});
});


counts.forEach(count => {
	describe(`search sequence of ${ count } elements`, () => {
		const items = range(1, count);
		const searchId = count / 2;
		const search = (n: number): boolean => n === searchId;

		bench('searchSequence', () => {
			const iterator = iterateSome(items);

			const found = searchSequence({
				first: iterator.next().value,
				next:  _ => iterator.next()?.value,
				search,
			});

			expect(found).toEqual(searchId);
		});

		bench('traverseSequenceSignal', () => {
			const iterator = iterateSome(items);

			const found = traverseSequenceSignal({
				first:  iterator.next().value,
				signal: (n, s) => {
					if (!search(n)) {
						s.skip();
						s.next(iterator.next()?.value);
					}
				},
			}).next()?.value;

			expect(found).toEqual(searchId);
		});

		bench('flattenSequenceSignal', () => {
			const iterator = iterateSome(items);

			const found = flattenSequenceSignal({
				first:  iterator.next().value,
				signal: (n, s) => {
					if (!search(n)) {
						s.skip();
						s.next(iterator.next()?.value);
					}
				},
			})[0];

			expect(found).toEqual(searchId);
		});
	});
});

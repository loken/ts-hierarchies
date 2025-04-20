import { bench, describe, expect } from 'vitest';

import { iterateAll, iterateSome, range } from '@loken/utilities';
import { traverseFullSequence, traverseSignalSequence } from './sequence-traverse.ts';
import { flattenFullSequence, flattenSignalSequence } from './sequence-flatten.ts';
import { searchSequence } from './sequence-search.ts';

const counts = [ 1_000, 10_000, 100_000 ];


counts.forEach(count => {
	describe(`traverse sequence of ${ count } elements`, () => {
		const items = range(1, count);

		bench('traverseFullSequence', () => {
			const iterator = iterateSome(items);

			iterateAll(traverseFullSequence({
				first: iterator.next().value,
				next:  _ => iterator.next()?.value,
			}));
		});

		bench('traverseSignalSequence', () => {
			const iterator = iterateSome(items);

			iterateAll(traverseSignalSequence({
				first:  iterator.next().value,
				signal: (_, s) => s.next(iterator.next()?.value),
			}));
		});

		bench('flattenFullSequence', () => {
			const iterator = iterateSome(items);

			flattenFullSequence({
				first: iterator.next().value,
				next:  _ => iterator.next()?.value,
			});
		});

		bench('flattenSignalSequence', () => {
			const iterator = iterateSome(items);

			flattenSignalSequence({
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
		const search = (n: number) => n === searchId;

		bench('searchGraph', () => {
			const iterator = iterateSome(items);

			const found = searchSequence({
				first: iterator.next().value,
				next:  _ => iterator.next()?.value,
				search,
			});

			expect(found).toEqual(searchId);
		});

		bench('traverseSignalSequence', () => {
			const iterator = iterateSome(items);

			const found = traverseSignalSequence({
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

		bench('flattenSignalGraph', () => {
			const iterator = iterateSome(items);

			const found = flattenSignalSequence({
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

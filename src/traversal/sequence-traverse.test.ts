import { iterateAll, multipleToArray, range, traverseRange } from '@loken/utilities';
import { describe, expect, it } from 'vitest';

import { traverseSequence } from './sequence-traverse.js';


describe('traverseSequence', () => {
	// We're using a generator for these tests, but a sequence can be
	// anything which has a next value, such as a linked list.

	it('should yield values in order', () => {
		const expected = range(0, 5);
		const sequence = traverseRange(0, 5);

		const actual = traverseSequence({
			first: sequence.next().value,
			next:  () => {
				const next = sequence.next();

				return next.done ? undefined : next.value;
			},
		});

		expect(multipleToArray(actual)).toEqual(expected);
	});

	it('should yield values in order and skip as signaled.', () => {
		const expected = [ 2 ];
		const sequence = traverseRange(1, 4);

		const actual = traverseSequence({
			first:  sequence.next(),
			signal: (element, signal) => {
				// Skip odd numbers.
				if (element.value! % 2 == 1)
					signal.skip();

				// By not providing the next value at el 3
				// we don't iterate into el 4 which would otherwise not be skipped.
				if (element.value === 3)
					return;

				// Signal the next element unless we're done.
				const next = sequence.next();
				if (!next.done)
					signal.next(next);
			},
		});

		const actualArr = multipleToArray(actual).map(el => el.value!);

		expect(actualArr).toEqual(expected);
	});

	it('should report correct index and count when there are skips.', () => {
		// We set it up so that index and value matches
		// and so that we exclude odd values from the result.
		const expectedCounts = [ 0, 1, 1, 2, 2 ];
		const sequence = traverseRange(0, 5);

		const actual = traverseSequence({
			first:  sequence.next(),
			signal: (element, signal) => {
				const expectedCount = expectedCounts[signal.index];
				expect(signal.count, 'count').toEqual(expectedCount);
				expect(signal.index, 'value').toEqual(element.value);

				if (element.value! % 2 == 1)
					signal.skip();

				// Signal the next element unless we're done.
				const next = sequence.next();
				if (!next.done)
					signal.next(next);
			},
		});

		iterateAll(actual);
	});
});

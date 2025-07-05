import { range, traverseRange } from '@loken/utilities';
import { expect, test } from 'vitest';

import { traverseSequence } from './sequence-traverse.js';


// We're using a generator for these tests, but a sequence can be
// anything which has a next value, such as a linked list.

test('traverseSequence (next) yields in order', () => {
	const expected = range(0, 5);
	const sequence = traverseRange(0, 5);

	const actual = traverseSequence({
		first: sequence.next().value,
		next:  () => {
			const next = sequence.next();

			return next.done ? undefined : next.value;
		},
	});

	expect(actual.toArray()).toEqual(expected);
});

test('traverseSequence (signal) with skip yields in correct values', () => {
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

	const actualItems = actual.map(el => el.value!).toArray();

	expect(actualItems).toEqual(expected);
});

test('traverseSequence (signal) with skip provides correct index and count', () => {
	// We set it up so that index and value matches
	// and so that we exclude odd values from the result.
	const sequence = traverseRange(0, 5);
	const expected = [ 0, 2, 4 ];
	const expectedCounts = [ 0, 1, 1, 2, 2 ];

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

	const actualValues = actual.map(el => el.value!).toArray();

	expect(actualValues).toEqual(expected);
});

test('traverseSequence (next) with empty sequence yields nothing', () => {
	const actual = traverseSequence({
		first: undefined,
		next:  () => undefined,
	});

	expect(actual.toArray()).toEqual([]);
});

test('traverseSequence (next) with single element yields one item', () => {
	const expected = [ 42 ];

	const actual = traverseSequence({
		first: 42,
		next:  () => undefined,
	});

	expect(actual.toArray()).toEqual(expected);
});

test('traverseSequence (signal) with early termination yields wanted element', () => {
	// Let's implement a search for a single element by not providing next elements after we find it.
	const expected = [ 3 ];
	const sequence = traverseRange(0, 10);

	const actual = traverseSequence({
		first:  sequence.next(),
		signal: (element, signal) => {
			// We want to stop traversal once we find the element we want
			// and to skip every other element.
			if (element.value === 3) {
				// Don't provide next element to stop traversal
				return;
			}
			else {
				signal.skip();
			}

			// Signal the next element unless we're done.
			const next = sequence.next();
			if (!next.done)
				signal.next(next);
		},
	});

	const actualValues = actual.map(el => el.value!).toArray();

	expect(actualValues).toEqual(expected);
});

test('traverseSequence (signal) with undefined first element yields nothing', () => {
	const actual = traverseSequence({
		first:  undefined,
		signal: (_element, _signal) => {
			// This should never be called
			expect.fail('Signal function should not be called with undefined first element');
		},
	});

	expect(actual.toArray()).to.be.empty;
});

import { traverseRange } from '@loken/utilities';
import { expect, test } from 'vitest';

import { searchSequence, searchSequenceMany } from './sequence-search.js';


test('searchSequence finds first matching element', () => {
	const sequence = traverseRange(0, 5);

	const first = sequence.next().value as number | undefined;
	const found = searchSequence({
		first,
		next: () => {
			const n = sequence.next();

			return n.done ? undefined : (n.value as number);
		},
		search: v => v === 3,
	});

	expect(found).toEqual(3);
});

test('searchSequenceMany finds all matching elements', () => {
	const expected = [ 0, 2, 4 ];
	const sequence = traverseRange(0, 5);

	const first = sequence.next().value as number | undefined;
	const found = searchSequenceMany({
		first,
		next: () => {
			const n = sequence.next();

			return n.done ? undefined : (n.value as number);
		},
		search: v => v % 2 === 0,
	});

	expect(found).toEqual(expected);
});

test('searchSequence with empty sequence returns undefined', () => {
	const found = searchSequence({
		first:  undefined,
		next:   () => undefined,
		search: () => true,
	});

	expect(found).toBeUndefined();
});

test('searchSequenceMany with empty sequence returns empty array', () => {
	const found = searchSequenceMany({
		first:  undefined,
		next:   () => undefined,
		search: () => true,
	});

	expect(found).toEqual([]);
});

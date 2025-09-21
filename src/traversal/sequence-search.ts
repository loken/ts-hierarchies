import type { Predicate } from '@loken/utilities';
import type { NextElement } from './sequence.types.js';

/**
 * Search a sequence of elements by traversing from the `first` element and onwards using the `next` delegate.
 *
 * The search will stop when the first element matching the `search` predicate is found.
 */
export const searchSequence = <TEl>(options: {
	first:  TEl | undefined;
	next:   NextElement<TEl>;
	search: Predicate<TEl>;
}): TEl | void => {
	let current = options.first;
	while (current !== undefined) {
		if (options.search(current))
			return current;

		current = options.next(current);
	}
};

/**
 * Search a sequence of elements by traversing from the `first` element and onwards using the `next` delegate.
 *
 * The search is exhaustive and will return all elements matching the `search` predicate.
 */
export const searchSequenceMany = <TEl>(options: {
	first:  TEl | undefined;
	next:   NextElement<TEl>;
	search: Predicate<TEl>;
}): TEl[] => {
	const result: TEl[] = [];
	let current = options.first;
	while (current !== undefined) {
		if (options.search(current))
			result.push(current);

		current = options.next(current);
	}

	return result;
};

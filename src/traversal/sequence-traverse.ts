import { SequenceSignal } from './sequence-signal.js';
import type { NextElement, SequenceTraversal, SignalElement } from './sequence.types.js';


/**
 * Generate a sequence of elements starting with the `first` element and traversing according to the options.
 */
export const traverseSequence = <TEl>(options: SequenceTraversal<TEl>): Generator<TEl, void, undefined> => {
	if (options.signal !== undefined)
		return traverseSignalSequence(options);
	else
		return traverseFullSequence(options);
};

/** @internalexport */
export function* traverseSignalSequence<TEl>(options: {
	first:  TEl | undefined;
	signal: SignalElement<TEl>;
}) {
	const signal = new SequenceSignal<TEl>(options);
	const signalFn = options.signal;
	let res = signal.tryGetNext();
	while (res[1]) {
		signalFn(res[0], signal);

		if (signal.shouldYield())
			yield res[0];

		signal.cleanup();

		res = signal.tryGetNext();
	}
};

/** @internalexport */
export function* traverseFullSequence<TEl>(options: {
	first: TEl | undefined;
	next:  NextElement<TEl>;
}) {
	let current = options.first;
	while (current !== undefined) {
		yield current;
		current = options.next(current);
	}
};

import { SequenceSignal } from './sequence-signal.ts';
import type { NextElement, SequenceTraversal, SignalElement } from './sequence.types.ts';


/**
 * Flatten a sequence of elements starting with the `first` element and traversing according to the options.
 */
export const flattenSequence = <TEl>(options: SequenceTraversal<TEl>) => {
	if (options.signal !== undefined)
		return flattenSignalSequence(options);
	else
		return flattenFullSequence(options);
};


/** @internalexport */
export const flattenSignalSequence = <TEl>(options: {
	first:  TEl | undefined;
	signal: SignalElement<TEl>;
}): TEl[] => {
	const result: TEl[] = [];
	const signal = new SequenceSignal<TEl>(options);
	const signalFn = options.signal;
	let res = signal.tryGetNext();
	while (res[1]) {
		signalFn(res[0], signal);

		if (signal.shouldYield())
			result.push(res[0]);

		signal.cleanup();

		res = signal.tryGetNext();
	}

	return result;
};

/** @internalexport */
export const flattenFullSequence = <TEl>(options: {
	first: TEl | undefined;
	next:  NextElement<TEl>;
}): TEl[] => {
	const result: TEl[] = [];
	let current = options.first;
	while (current !== undefined) {
		result.push(current);
		current = options.next(current);
	}

	return result;
};

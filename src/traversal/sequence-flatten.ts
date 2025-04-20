import { SequenceSignal } from './sequence-signal.ts';
import type { SequenceTraversal, SignalElement } from './sequence.types.ts';


/**
 * Flatten a sequence of elements starting with the `first` element and traversing according to the options.
 */
export const flattenSequence = <TEl>(options: SequenceTraversal<TEl>) => {
	const result: TEl[] = [];
	const traverse: SignalElement<TEl> = options.signal !== undefined
		? options.signal
		: (e, s) => s.next(options.next(e));

	const signal = new SequenceSignal<TEl>(options);
	let res = signal.tryGetNext();
	while (res[1]) {
		traverse(res[0], signal);

		if (signal.shouldYield())
			result.push(res[0]);

		signal.cleanup();

		res = signal.tryGetNext();
	}

	return result;
};

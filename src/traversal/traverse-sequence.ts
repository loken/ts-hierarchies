import { type ISequenceSignal, SequenceSignal } from './sequence-signal.js';


/** Describes how to get the next element of the sequence. */
export type NextElement<TEl> = (element: TEl) => TEl | undefined;

/** Describes how to traverse a sequence when visiting an element using an `ISequenceSignal`. */
export type SignalElement<TEl> = (element: TEl, signal: ISequenceSignal<TEl>) => void;


/**
 * Options for sequence traversal.
 *
 * You must either provide a delegate using a `signal` or a delegate simply providing the `next` nodes.
 */
export type SequenceTraversal<TEl> = {
	/** The first element of the traversal. */
	first: TEl | undefined;
} & ({
	/** Describes how to get the the next element while traversing a sequence. */
	next: NextElement<TEl>;

	/** Discriminated: Cannot pass a `signal` delegate when you've already passed a `next` delegate. */
	signal?: never;
} | {
	/** Describes how to traverse a sequence when visiting an element using an `ISequenceSignal`. */
	signal: SignalElement<TEl>;

	/** Discriminated: Cannot pass a `next` delegate when you've already passed a `signal` delegate. */
	next?: never;
});


/**
 * Generate a sequence of elements starting with the `first` element and traversing according to the options.
 */
export function* traverseSequence<TEl>(options: SequenceTraversal<TEl>) {
	const traverse: SignalElement<TEl> = options.signal !== undefined
		? options.signal
		: (e, s) => s.next(options.next(e));

	const signal: SequenceSignal<TEl> = new SequenceSignal(options);
	let res = signal.tryGetNext();
	while (res[1]) {
		traverse(res[0], signal);

		if (signal.shouldYield())
			yield res[0];

		signal.cleanup();

		res = signal.tryGetNext();
	}
}

/**
 * Flatten a sequence of elements starting with the `first` element and traversing according to the options.
 */
export const flattenSequence = <TEl>(options: SequenceTraversal<TEl>) => {
	const result: TEl[] = [];
	const traverse: SignalElement<TEl> = options.signal !== undefined
		? options.signal
		: (e, s) => s.next(options.next(e));

	const signal: SequenceSignal<TEl> = new SequenceSignal(options);
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

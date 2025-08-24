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


/** Describes how to get the next element of the sequence. */
export type NextElement<TEl> = (element: TEl) => TEl | undefined;

/** Describes how to traverse a sequence when visiting an element using an `ISequenceSignal`. */
export type SignalElement<TEl> = (element: TEl, signal: ISequenceSignal<TEl>) => void;


/**
 * Use this to signal to the traversal what's `next` and what to `skip`,
 * and optionally to explicitly `yield` or to `prune` the next element.
 */
export interface ISequenceSignal<TEl> {
	/** The source index of the current element. */
	get index(): number;
	/** The number of elements returned so far. */
	get count(): number;

	/** Call this when traversal should continue to the next element. */
	next(element?: TEl): void;
	/**
	 * Explicitly mark that the current element should be yielded (included in the output).
	 * By default elements are yielded unless {@link skip} is called; use this for clarity in complex callbacks.
	 * Mutually exclusive with {@link skip} for the same element.
	 */
	yield(): void;
	/**
	 * Call this when you want to signal that the current element should be skipped,
	 * meaning it will not be part of the output.
	 *
	 * Traversal will still continue to an element passed to
	 * `next` irrespective of calling `skip`.
	 */
	skip(): void;
	/**
	 * Prune the sequence by not traversing to a next element for this iteration.
	 * Functionally equivalent to not calling {@link next}.
	 * Mutually exclusive with {@link next} for the same element.
	 */
	prune(): void;
}

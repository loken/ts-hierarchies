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
 * Use this to signal to the traversal what's `next` and what to `skip`.
 */
export interface ISequenceSignal<TEl> {
	/** The source index of the current element. */
	get index(): number;
	/** The number of elements returned so far. */
	get count(): number;

	/** Call this when traversal should continue to a sub sequence of child roots. */
	next(element?: TEl): void;
	/**
	 * Call this when you want to signal that the current element should be skipped,
	 * meaning it will not be part of the output.
	 *
	 * Traversal will still continue to an element passed to
	 * `next` irrespective of calling `skip`.
	 */
	skip(): void;
}

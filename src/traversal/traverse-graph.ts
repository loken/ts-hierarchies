import { type Multiple } from '@loken/utilities';

import { GraphSignal, type IGraphSignal } from './graph-signal.js';
import { type TraverseGraph } from './traverse-types.js';


/** Describes how to get the the next nodes from a node visited while traversing a graph. */
export type NextNodes<TNode> = (node: TNode) => TNode[];

/** Describes how to traverse a graph when visiting a node using an `IGraphSignal`. */
export type SignalNodes<TNode> = (node: TNode, signal: IGraphSignal<TNode>) => void;


/**
 * Options for graph traversal.
 *
 * You must either provide a delegate using a `signal` or a delegate simply providing the `next` nodes.
 */
export type GraphTraversal<TNode> = TraverseGraph & {
	/** The roots may have parents, but they are treated as depth 0 nodes for the traversal. */
	roots: Multiple<TNode>,
	/** Should we be looking for cycles in the graph (`true`) or is it an acyclic graph/tree and we don't need to (`false` by default)? */
	detectCycles?: boolean,
} & ({
	/** Describes how to get the the next nodes from a node visited while traversing a graph. */
	next: NextNodes<TNode>,
	/** Discriminated: Cannot pass a `signal` delegate when you've already passed a `next` delegate. */
	signal?: never;
} | {
	/** Describes how to traverse a graph when visiting a node using an `IGraphSignal`. */
	signal: SignalNodes<TNode>,
	/** Discriminated: Cannot pass a `next` delegate when you've already passed a `signal` delegate. */
	next?: never,
});


/**
 * Generate a sequence of nodes by traversing the provided `roots` according to the options.
 */
export function* traverseGraph<TNode>(options: GraphTraversal<TNode>) {
	const traverse: SignalNodes<TNode> = options.signal !== undefined
		? options.signal
		: (n, s) => s.next(options.next(n));

	const signal = new GraphSignal<TNode>(options);
	let res = signal.tryGetNext();
	while (res.success) {
		traverse(res.value, signal);

		if (signal.shouldYield())
			yield res.value;

		signal.cleanup();

		res = signal.tryGetNext();
	}
}
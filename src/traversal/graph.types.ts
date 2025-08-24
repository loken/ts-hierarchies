import type { Some } from '@loken/utilities';


/**
 * The type of traversal.
 * - `breadth-first` (default): Breadth first processes each node at a given depth before it proceeds to the next depth.
 * - `depth-first`: Depth first traverses as deep as it can at any given time only exploring the next branch once the previous one has been fully explored.
 */
export type TraversalType = 'breadth-first' | 'depth-first';


/**
 * Options for graph traversal.
 *
 * You must either provide a delegate using a `signal` or a delegate simply providing the `next` nodes.
 */
export type GraphTraversal<TNode> = {
	/** The roots may have parents, but they are treated as depth 0 nodes for the traversal. */
	roots: Some<TNode>;

	/**
	 * The type of traversal.
	 * - `breadth-first` (default): Breadth first processes each node at a given depth before it proceeds to the next depth.
	 * - `depth-first`: Depth first traverses as deep as it can at any given time only exploring the next branch once the previous one has been fully explored.
	 */
	type?: TraversalType;

	/** Should we be looking for cycles in the graph (`true`) or is it an acyclic graph/tree and we don't need to (`false` by default)? */
	detectCycles?: boolean;
} & ({
	/** Describes how to get the the next nodes from a node visited while traversing a graph. */
	next: NextNodes<TNode>;

	/** Discriminated: Cannot pass a `signal` delegate when you've already passed a `next` delegate. */
	signal?: never;
} | {
	/** Describes how to traverse a graph when visiting a node using an `IGraphSignal`. */
	signal: SignalNodes<TNode>;

	/** Discriminated: Cannot pass a `next` delegate when you've already passed a `signal` delegate. */
	next?: never;
});


/** Describes how to get the the next nodes from a node visited while traversing a graph. */
export type NextNodes<TNode> = (node: TNode) => TNode[] | Set<TNode> | undefined | void;

/** Describes how to traverse a graph when visiting a node using an `IGraphSignal`. */
export type SignalNodes<TNode> = (node: TNode, signal: IGraphSignal<TNode>) => void;


/**
 * Use this to signal to the traversal what's `next`, what to `skip`,
 * whether to explicitly `yield`, whether to `prune` children, and whether to `stop`.
 */
export interface IGraphSignal<TNode> {
	/** Depth of the current root relative to the traversal roots. */
	get depth(): number;
	/** The number of elements returned so far. */
	get count(): number;

	/** Call this when traversal should continue to a sub sequence of child roots. */
	next(nodes: Some<TNode>): void;
	/**
	 * Explicitly mark that the current node should be yielded (included in the output).
	 * By default nodes are yielded unless {@link skip} is called; use this for clarity in complex callbacks.
	 * Mutually exclusive with {@link skip} for the same node.
	 */
	yield(): void;
	/**
	 * Call this when you want to signal that the current root should be skipped,
	 * meaning it will not be part of the output.
	 *
	 * Traversal will still continue to whatever roots are passed to
	 * `next` irrespective of calling `skip`.
	 */
	skip(): void;
	/**
	 * Prune the current branch by not traversing any children for this node.
	 * Functionally equivalent to not calling {@link next}.
	 * Mutually exclusive with {@link next} for the same node.
	 */
	prune(): void;
	/**
	 * Call this when all traversal should stop immediately.
	 *
	 * Ending traversal of a particular branch is controlled by not calling
	 * `next` for that branch.
	 */
	stop(): void;
}

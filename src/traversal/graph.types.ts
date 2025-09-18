import { type Some } from '@loken/utilities';


/**
 * The type of traversal.
 * - `breadth-first` (default): Breadth first processes each node at a given depth before it proceeds to the next depth.
 * - `depth-first`: Depth first traverses as deep as it can at any given time only exploring the next branch once the previous one has been fully explored.
 */
export type TraversalType = 'breadth-first' | 'depth-first';

/** Describes how to get the the next nodes from a node visited while traversing a graph. */
export type NextNodes<TNode> = (node: TNode) => TNode[] | Set<TNode> | undefined | void;

/** Describes how to traverse a graph when visiting a node using an `IGraphSignal`. */
export type SignalNodes<TNode> = (node: TNode, signal: IGraphSignal<TNode>) => void;


/**
 * Graph traversal options.
 */
export interface TraversalOptions {
	/**
	 * The type of traversal.
	 * - `breadth-first` (default): Breadth first processes each node at a given depth before it proceeds to the next depth.
	 * - `depth-first`: Depth first traverses as deep as it can at any given time only exploring the next branch once the previous one has been fully explored.
	 */
	type?:         TraversalType;
	/** Should we include the root node in the traversal (`true`) or start from its children (`false` by default)? */
	includeSelf?:  boolean;
	/** Should we be looking for cycles in the graph (`true`) or is it an acyclic graph/tree and we don't need to (`false` by default)? */
	detectCycles?: boolean;
	/** The order in which sibling nodes should be traversed, forward (default) or reverse. */
	siblingOrder?: 'forward' | 'reverse';
}

/**
 * Graph traversal parameter extended to allow shorthands.
 * Each shorthand assigns some options and uses the defaults for the rest.
 *
 * | Shorthands                  | Meaning                                            | Options                                        |
 * |:----------------------------|:---------------------------------------------------|:-----------------------------------------------|
 * | `'with-self'`               | Include the root node(s)                           | `{ includeSelf: true }`                        |
 * | `'breadth-first'`           | Breadth-first traversal excluding the root node(s) | `{ type: 'breadth-first' }`                    |
 * | `'breadth-first-with-self'` | Breadth-first traversal including the root node(s) | `{ type: 'breadth-first', includeSelf: true }` |
 * | `'depth-first'`             | Depth-first traversal excluding the root node(s)   | `{ type: 'depth-first' }`                      |
 * | `'depth-first-with-self'`   | Depth-first traversal including the root node(s)   | `{ type: 'depth-first', includeSelf: true }`   |
 */
export type TraversalParam = TraversalOptions | TraversalType | 'with-self' | 'breadth-first-with-self' | 'depth-first-with-self';

/**
 * Normalize a `TraversalParam` into a full `TraversalOptions` object.
 */
export const traversalOptions = (options?: TraversalParam, defaults?: TraversalOptions): TraversalOptions => {
	if (options === undefined)
		return defaults ?? {};

	if (typeof options === 'string') {
		switch (options) {
			case 'with-self':
				return { ...defaults, includeSelf: true };
			case 'breadth-first-with-self':
				return { ...defaults, includeSelf: true, type: 'breadth-first' };
			case 'depth-first-with-self':
				return { ...defaults, includeSelf: true, type: 'depth-first' };
			default:
				return { ...defaults, type: options };
		}
	}

	if (defaults === undefined)
		return options;

	// Fill in any missing options from defaults
	// (Avoiding looping over keys for performance reasons)
	if (defaults.type !== undefined && options.type === undefined)
		options.type = defaults.type;
	if (defaults.includeSelf !== undefined && options.includeSelf === undefined)
		options.includeSelf = defaults.includeSelf;
	if (defaults.detectCycles !== undefined && options.detectCycles === undefined)
		options.detectCycles = defaults.detectCycles;
	if (defaults.siblingOrder !== undefined && options.siblingOrder === undefined)
		options.siblingOrder = defaults.siblingOrder;

	return options;
};

export interface TraversalRoots<TNode> {
	/** The roots may have parents, but they are treated as depth 0 nodes for the traversal. */
	roots: Some<TNode>;

	/** Optional traversal options or shorthands. */
	traversal?: TraversalParam;
}


export interface TraversalNext<TNode> extends TraversalRoots<TNode> {
	/** Describes how to get the the next nodes from a node visited while traversing a graph. */
	next: NextNodes<TNode>;

	/** Discriminated: Cannot pass a `signal` delegate when you've already passed a `next` delegate. */
	signal?: never;
}

export interface TraversalSignal<TNode> extends TraversalRoots<TNode> {
	/** Describes how to traverse a graph when visiting a node using an `IGraphSignal`. */
	signal: SignalNodes<TNode>;

	/** Discriminated: Cannot pass a `next` delegate when you've already passed a `signal` delegate. */
	next?: never;
}

/**
 * Options for graph traversal.
 *
 * You must either provide a delegate using a `signal` or a delegate simply providing the `next` nodes.
 */
export type TraversalControl<TNode> = TraversalNext<TNode> | TraversalSignal<TNode>;


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

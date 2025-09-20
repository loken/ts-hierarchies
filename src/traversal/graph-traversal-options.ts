// Option-related traversal types and normalization helper colocated to reduce import fan-out and keep graph.types.ts pure.

/**
 * The type of traversal.
 * - `breadth-first` (default): Breadth first processes each node at a given depth before it proceeds to the next depth.
 * - `depth-first`: Depth first traverses as deep as it can at any given time only exploring the next branch once the previous one has been fully explored.
 */
export type TraversalType = 'breadth-first' | 'depth-first';

/**
 * Graph traversal options.
 *
 * Notes on defaults:
 * - Semantic baseline: an omitted field is treated as its neutral / "off" value.
 * - Naming rule for includeSelf:
 *   - APIs whose name references "descendant" / "descendants" default `includeSelf` to `false` (start from children).
 *   - All others (e.g. `traverseGraph` / `flattenGraph` / `searchGraph`) default it to `true` (start from the provided roots).
 */
export interface TraversalOptions {
	/**
	 * The type of traversal.
	 * - `breadth-first` (default): Breadth first processes each node at a given depth before it proceeds to the next depth.
	 * - `depth-first`: Depth first traverses as deep as it can at any given time only exploring the next branch once the previous one has been fully explored.
	 */
	type?:         TraversalType;
	/** Include the root node(s) (`true`) or start from their children (`false`). Naming rule: helpers whose name mentions descendants default to `false`; others default to `true`. */
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
 * Normalize traversal options.
 * - Shorthand string inputs always produce a new object.
 * - Returns the original object if no defaults were applied.
 * - Allocates a new object only when shorthands are used or at least one default fills a missing field.
 */
export const traversalOptions = (options?: TraversalParam, defaults?: TraversalOptions): TraversalOptions => {
	// Fast path: no user options provided
	if (options === undefined)
		return defaults ? { ...defaults } : {};

	// Shorthand strings always produce a (possibly merged) new object
	if (typeof options === 'string') {
		switch (options) {
			case 'with-self':
				return defaults ? { ...defaults, includeSelf: true } : { includeSelf: true };
			case 'breadth-first-with-self':
				return defaults ? { ...defaults, includeSelf: true, type: 'breadth-first' } : { includeSelf: true, type: 'breadth-first' };
			case 'depth-first-with-self':
				return defaults ? { ...defaults, includeSelf: true, type: 'depth-first' } : { includeSelf: true, type: 'depth-first' };
			default:
				return defaults ? { ...defaults, type: options } : { type: options };
		}
	}

	// At this point options is an object. If no defaults -> return as-is (do not clone).
	if (!defaults)
		return options;

	// Determine whether any default will be applied (single const expression for minification friendliness & clarity).
	const needsDefaults =
		(options.type         === undefined && defaults.type         !== undefined) ||
		(options.includeSelf  === undefined && defaults.includeSelf  !== undefined) ||
		(options.detectCycles === undefined && defaults.detectCycles !== undefined) ||
		(options.siblingOrder === undefined && defaults.siblingOrder !== undefined);

	// No defaults needed -> return original reference (no clone).
	if (!needsDefaults)
		return options;

	// Some defaults missing -> return new object with defaults filled in.
	return {
		type:         options.type ?? defaults.type,
		includeSelf:  options.includeSelf ?? defaults.includeSelf,
		detectCycles: options.detectCycles ?? defaults.detectCycles,
		siblingOrder: options.siblingOrder ?? defaults.siblingOrder,
	};
};

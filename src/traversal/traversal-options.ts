/**
 * The type of traversal.
 * - `breadth-first` (default): Breadth first processes each node at a given depth before it proceeds to the next depth.
 * - `depth-first`: Depth first traverses as deep as it can at any given time only exploring the next branch once the previous one has been fully explored.
 */
export type TraversalType = 'breadth-first' | 'depth-first';

/**
 * The order in which sibling nodes should be traversed, forward (default) or reverse.
 */
export type SiblingOrder = 'forward' | 'reverse';

/**
 * Ancestor traversal control.
 *
 * Shorthands:
 * - `'with-self'`: Start evaluation at the provided node(s) (include them as potential ancestors).
 * - `'without-self'` (default when omitted): Start from the parent of each provided node.
 *
 * Naming/default rule symmetry:
 * - Any API whose name references `ancestor` / `ancestors` defaults to `'without-self'` (exclude the starting node itself).
 * - Generic helpers (e.g. internal ancestor search utilities) may default to `'with-self'` when semantically treating the starting node as part of a chain.
 *
 * Rationale: Ancestor queries typically mean "walk upward" which conceptually begins at the parent unless you explicitly opt into including the starting node.
 */
export type Ascend = 'with-self' | 'without-self';


/**
 * Descendant traversal parameter with expressive shorthands.
 *
 * Defaults & semantics:
 * - Omitted fields are neutral (we only apply provided values and optional external defaults).
 * - Naming/default rule for `includeSelf`:
 *   - APIs whose name references `descendant` / `descendants` default `includeSelf` to `false` (start from children).
 *   - General traversal/search helpers like `traverseGraph`, `flattenGraph`, `searchGraph` default `includeSelf` to `true` (start from the provided roots) for ergonomic top-down iteration.
 *
 * Shorthands table:
 * | Shorthand                      | Meaning                                              | Normalized options                              |
 * |:-------------------------------|:-----------------------------------------------------|:------------------------------------------------|
 * | `'with-self'`                  | Include the root node(s)                             | `{ includeSelf: true }`                         |
 * | `'without-self'`               | Exclude the root node(s)                             | `{ includeSelf: false }`                        |
 * | `'breadth-first'`              | Breadth-first traversal (exclude roots by name rule) | `{ type: 'breadth-first' }`                     |
 * | `'breadth-first-with-self'`    | Breadth-first traversal including the root node(s)   | `{ type: 'breadth-first', includeSelf: true }`  |
 * | `'breadth-first-without-self'` | Breadth-first traversal excluding the root node(s)   | `{ type: 'breadth-first', includeSelf: false }` |
 * | `'depth-first'`                | Depth-first traversal (exclude roots by name rule)   | `{ type: 'depth-first' }`                       |
 * | `'depth-first-with-self'`      | Depth-first traversal including the root node(s)     | `{ type: 'depth-first', includeSelf: true }`    |
 * | `'depth-first-without-self'`   | Depth-first traversal excluding the root node(s)     | `{ type: 'depth-first', includeSelf: false }`   |
 */
export type Descend =
	| DescendOptions
	| TraversalType
	| 'with-self'
	| 'without-self'
	| 'breadth-first-with-self'
	| 'breadth-first-without-self'
	| 'depth-first-with-self'
	| 'depth-first-without-self';

/**
 * Descendant traversal options object form.
 *
 * NB! Prefer using the `Descend` union for callers (allows expressive shorthands), this interface is the normalized shape.
 */
export interface DescendOptions {
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
	siblingOrder?: SiblingOrder;
}


/**
 * Normalize descend to its object form.
 * - Applies optional defaults.
 * - Shorthand string inputs always produce a new object.
 * - Returns the original object if no defaults were applied.
 * - Allocates a new object only when shorthands are used or at least one default fills a missing field.
 */
export const normalizeDescend = (options?: Descend, defaults?: DescendOptions): DescendOptions => {
	// Fast path: no user options provided
	if (options === undefined)
		return defaults ? { ...defaults } : {};

	// Shorthand strings always produce a (possibly merged) new object
	if (typeof options === 'string') {
		switch (options) {
			case 'with-self':
				return defaults ? { ...defaults, includeSelf: true  } : { includeSelf: true };
			case 'without-self':
				return defaults ? { ...defaults, includeSelf: false } : { includeSelf: false };
			case 'breadth-first-with-self':
				return defaults ? { ...defaults, includeSelf: true,  type: 'breadth-first' } : { includeSelf: true, type: 'breadth-first' };
			case 'breadth-first-without-self':
				return defaults ? { ...defaults, includeSelf: false, type: 'breadth-first' } : { includeSelf: false, type: 'breadth-first' };
			case 'depth-first-with-self':
				return defaults ? { ...defaults, includeSelf: true,  type: 'depth-first' } : { includeSelf: true, type: 'depth-first' };
			case 'depth-first-without-self':
				return defaults ? { ...defaults, includeSelf: false, type: 'depth-first' } : { includeSelf: false, type: 'depth-first' };
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

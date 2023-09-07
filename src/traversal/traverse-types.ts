/**
 * The type of traversal.
 * - `breadth-first` (default): Breadth first processes each node at a given depth before it proceeds to the next depth.
 * - `depth-first`: Depth first traverses as deep as it can at any given time only exploring the next branch once the previous one has been fully explored.
 */
export type TraversalType = 'breadth-first' | 'depth-first';

export type TraverseGraph = {
	/**
	 * The type of traversal.
	 * - `breadth-first` (default): Breadth first processes each node at a given depth before it proceeds to the next depth.
	 * - `depth-first`: Depth first traverses as deep as it can at any given time only exploring the next branch once the previous one has been fully explored.
	 */
	type?: TraversalType,
}

export type TraverseSelf = {
	/** Exclude the starting nodes themselves from the traversal? (default: `false`) */
	excludeSelf?: boolean,
}

export type TraverseGraphSelf = TraverseGraph & TraverseSelf;

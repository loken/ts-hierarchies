import { type ILinear, LinearQueue, LinearStack, type Some, Stack, type TryResult, someToIterable } from '@loken/utilities';

import { type IGraphSignal, type TraversalRoots } from './graph.types.js';
import { normalizeDescend } from './traversal-options.js';


/**
 * @internal Traversal signal engine implementing breadth-first / depth-first with optional cycle detection
 * and sibling order control. Users interact indirectly via the signal callback.
 */
export class GraphSignal<TNode> implements IGraphSignal<TNode> {

	//#region fields
	#visited?:            Set<TNode>;
	#isDepthFirst:        boolean;
	#reverseSiblingOrder: boolean;
	#nodes:               ILinear<TNode>;
	#depth = 0;
	#branchCount:         Stack<number>;
	#depthCount = 0;
	#count = 0;
	#skipped = false;
	#yielded = false;
	#pruned = false;
	#nextSet = false;
	//#endregion

	//#region IGraphSignal
	/** Current depth (root = 0). */
	public get depth(): number {
		return this.#depth;
	}

	/** Number of nodes yielded (excluding skipped) so far. */
	public get count(): number {
		return this.#count;
	}

	/** Queue or stack the provided child nodes for later traversal. */
	public next(nodes: Some<TNode>): void {
		// Mutually exclusive with prune on the same node
		if (this.#pruned)
			throw new Error(`Cannot call next() after prune(). prune and next are mutually exclusive for the same node.`);

		const count = this.#nodes.attach(nodes, this.#reverseSiblingOrder);

		if (this.#isDepthFirst && count > 0)
			this.#branchCount.push(count);

		this.#nextSet = count > 0;
	}

	/** Suppress yielding the current node (must not follow yield). */
	public skip(): void {
		// Mutually exclusive with yield on the same node
		if (this.#yielded)
			throw new Error(`Cannot call skip() after yield(). yield and skip are mutually exclusive for the same node.`);

		this.#skipped = true;
	}

	/** Mark the current node to be yielded (default unless skip() was called). */
	public yield(): void {
		if (this.#skipped)
			throw new Error(`Cannot call yield() after skip(). yield and skip are mutually exclusive for the same node.`);

		this.#yielded = true; // idempotent
	}

	/** Prevent traversal of this node's children (must not follow next()). */
	public prune(): void {
		if (this.#nextSet)
			throw new Error(`Cannot call prune() after next(). prune and next are mutually exclusive for the same node.`);

		this.#pruned = true; // idempotent
	}

	/** Terminate traversal early clearing pending nodes. */
	public stop(): void {
		this.#nodes.clear();
	}
	//endregion

	//#region internal
	/** Initialize traversal state. Optionally accepts a preloaded store for seeded roots. */
	constructor(options: TraversalRoots<TNode>) {
		const descend = normalizeDescend(options.descend);

		this.#reverseSiblingOrder = descend.siblingOrder === 'reverse';

		if (descend.detectCycles ?? false)
			this.#visited = new Set<TNode>();

		this.#isDepthFirst = descend.type === 'depth-first';

		this.#nodes = this.#isDepthFirst
			? new LinearStack<TNode>()
			: new LinearQueue<TNode>();

		this.#depthCount = this.#nodes.attach(options.roots, this.#reverseSiblingOrder);

		if (this.#isDepthFirst) {
			this.#branchCount = new Stack<number>();
			this.#branchCount.push(this.#nodes.count);
		}
	}

	/** Whether the current node should be emitted (not skipped). */
	public shouldYield(): boolean {
		return !this.#skipped;
	}

	/** Finalize bookkeeping after processing a node (branch depth & count). */
	public cleanup(): void {
		if (this.#isDepthFirst) {
			let res = this.#branchCount.tryPeek();

			while (res[1] && res[0] === 0) {
				this.#branchCount.pop();

				res = this.#branchCount.tryPeek();
			}
		}

		if (!this.#skipped)
			this.#count++;
	}

	/** Detach next pending node (skipping already-visited when cycle detection enabled). */
	public tryGetNext(): TryResult<TNode, string> {
		if (this.#visited !== undefined) {
			let res = this.tryGetNextInternal();
			while (res[1]) {
				if (!this.#visited.has(res[0])) {
					this.#visited.add(res[0]);

					return res;
				}

				res = this.tryGetNextInternal();
			}

			return res;
		}
		else {
			return this.tryGetNextInternal();
		}
	}

	private tryGetNextInternal(): TryResult<TNode, string> {
		const res = this.#nodes.tryDetach();
		if (!res[1])
			return res;

		this.#skipped = false;
		this.#yielded = false;
		this.#pruned = false;
		this.#nextSet = false;

		if (this.#isDepthFirst) {
			this.#depth = this.#branchCount.count - 1;
			this.#branchCount.push(this.#branchCount.pop() - 1);
		}
		else {
			if (this.#depthCount-- == 0) {
				this.#depth++;
				this.#depthCount = this.#nodes.count;
			}
		}

		return res;
	}
	//#endregion

}

/**
 * @internal Seeding helper for `includeSelf=false`.\
 * Phase: call user signal once per original root, collect every `next()` target.\
 * Ignores yield/skip/prune; collected nodes become new roots (then traversed with includeSelf=true).
 */
export class GraphSignalSeeding<TNode> implements IGraphSignal<TNode> {

	#stopped = false;
	#roots = [] as TNode[];
	public readonly depth = 0;
	public readonly count = 0;

	/**
	 * The collected next-level roots in encounter order.
	 * Any reversal will be applied by the main traversal phase.
	 */
	public get roots(): TNode[] { return this.#roots; }

	public next(nodes: Some<TNode>): void {
		if (this.#stopped)
			return;

		for (const node of someToIterable(nodes))
			this.#roots.push(node);
	}

	/** Skip is a no-op during the seeding phase */
	public skip(): void { }
	/** Yield is a no-op during the seeding phase */
	public yield(): void { }
	/** Prune is a no-op during the seeding phase and does not protect against calls to both `prune` and `next` */
	public prune(): void { }
	/** Immediately stops the seeding phase by preventing any further calls to `next` */
	public stop(): void { this.#stopped = true; }

}

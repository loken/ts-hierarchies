import { type ILinear, LinearQueue, LinearStack, type Some, Stack, type TryResult } from '@loken/utilities';

import { traversalOptions, type IGraphSignal, type TraversalRoots } from './graph.types.js';


/**
 * @internal Has some members which must be public for internal use
 *           which should not be used by a consumer.
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
	#seeding = false;
	#seedCount = 0;
	//#endregion

	//#region IGraphSignal
	public get depth(): number {
		return this.#depth;
	}

	public get count(): number {
		return this.#count;
	}

	public next(nodes: Some<TNode>): void {
		// Mutually exclusive with prune on the same node
		if (this.#pruned)
			throw new Error(`Cannot call next() after prune(). prune and next are mutually exclusive for the same node.`);

		const count = this.#nodes.attach(nodes, this.#reverseSiblingOrder);

		if (this.#isDepthFirst && count > 0) {
			if (this.#seeding)
				this.#seedCount += count;
			else
				this.#branchCount.push(count);
		}

		this.#nextSet = count > 0;
	}

	public skip(): void {
		// Mutually exclusive with yield on the same node
		if (this.#yielded)
			throw new Error(`Cannot call skip() after yield(). yield and skip are mutually exclusive for the same node.`);

		this.#skipped = true;
	}

	public yield(): void {
		if (this.#skipped)
			throw new Error(`Cannot call yield() after skip(). yield and skip are mutually exclusive for the same node.`);

		this.#yielded = true; // idempotent
	}

	public prune(): void {
		if (this.#nextSet)
			throw new Error(`Cannot call prune() after next(). prune and next are mutually exclusive for the same node.`);

		this.#pruned = true; // idempotent
	}

	public stop(): void {
		this.#nodes.clear();
	}
	//endregion

	//#region internal
	constructor(options: TraversalRoots<TNode>) {
		const traversal = traversalOptions(options.traversal);

		this.#reverseSiblingOrder = traversal.siblingOrder === 'reverse';

		if (traversal.detectCycles ?? false)
			this.#visited = new Set<TNode>();

		this.#isDepthFirst = traversal.type === 'depth-first';

		this.#nodes = this.#isDepthFirst
			? new LinearStack<TNode>()
			: new LinearQueue<TNode>();

		if (traversal.includeSelf) {
			this.#depthCount = this.#nodes.attach(options.roots, this.#reverseSiblingOrder);

			if (this.#isDepthFirst) {
				this.#branchCount = new Stack<number>();
				this.#branchCount.push(this.#depthCount);
			}
		}
		else {
			// Defer attaching roots; we will seed children via signal.next() calls during a pre-pass.
			this.#seeding = true;
			this.#depthCount = 0;
			if (this.#isDepthFirst)
				this.#branchCount = new Stack<number>();
		}
	}

	public shouldYield(): boolean {
		return !this.#skipped;
	}

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
		// Finalize any deferred seeding before detaching the first node
		if (this.#seeding) {
			this.#seeding = false;
			if (this.#isDepthFirst) {
				// Initialize branch count with the total number of seeded top-level nodes
				this.#branchCount.push(this.#seedCount);
			}
			else {
				// Initialize breadth-first level count to number of seeded nodes
				this.#depthCount = this.#nodes.count;
			}
		}

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

import { type ILinear, LinearQueue, LinearStack, type Multiple, Stack, type TryResult } from '@loken/utilities';

import { type TraversalType } from './traverse-types.js';

/**
 * Use this to signal to the traversal what's `next`,
 * what to `skip` and whether to `end`.
 */
export interface IGraphSignal<TNode> {
	/** Depth of the current root relative to the traversal roots. */
	get depth(): number;
	/** The number of elements returned so far. */
	get count(): number;

	/** Call this when traversal should continue to a sub sequence of child roots. */
	next(nodes: Multiple<TNode>): void;
	/**
	 * Call this when you want to signal that the current root should be skipped,
	 * meaning it will not be part of the output.
	 *
	 * Traversal will still continue to whatever roots are passed to
	 * `next` irrespective of calling `skip`.
	 */
	skip(): void;
	/**
	 * Call this when all traversal should end immediately.
	 *
	 * Ending traversal of a particular branch is controlled by not calling
	 * `next` for that branch.
	 */
	end(): void;
}

/**
 * @internal Has some members which must be public for internal use
 *           which should not be used by a consumer.
 */
export class GraphSignal<TNode> implements IGraphSignal<TNode> {

	//#region fields
	#visited?: Set<TNode>;
	#isDepthFirst: boolean;
	#nodes: ILinear<TNode>;
	#depth = 0;
	#branchCount: Stack<number>;
	#depthCount = 0;
	#count = 0;
	#skipped = false;
	//#endregion

	//#region IGraphSignal
	public get depth() {
		return this.#depth;
	}

	public get count() {
		return this.#count;
	}

	public next(nodes: Multiple<TNode>) {
		const count = this.#nodes.attach(nodes);

		if (this.#isDepthFirst && count > 0)
			this.#branchCount.push(count);
	}

	public skip() {
		this.#skipped = true;
	}

	public end() {
		this.#nodes.clear();
	}
	//endregion

	//#region internal
	constructor(options: {roots: Multiple<TNode>, detectCycles?: boolean, type?: TraversalType}) {
		if (options.detectCycles ?? false)
			this.#visited = new Set<TNode>();

		this.#isDepthFirst = options.type === 'depth-first';

		this.#nodes = this.#isDepthFirst
			? new LinearStack<TNode>()
			: new LinearQueue<TNode>();

		this.#depthCount = this.#nodes.attach(options.roots);

		if (this.#isDepthFirst) {
			this.#branchCount = new Stack<number>();
			this.#branchCount.push(this.#depthCount);
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

	public tryGetNext(): TryResult<TNode> {
		if (this.#visited !== undefined) {
			let res: TryResult<TNode> = this.tryGetNextInternal();
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

	private tryGetNextInternal(): TryResult<TNode> {
		const res = this.#nodes.tryDetach();
		if (res[1]) {
			this.#skipped = false;

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

			this.#skipped = false;

			return res;
		}
		else {
			return res;
		}
	}
	//#endregion

}

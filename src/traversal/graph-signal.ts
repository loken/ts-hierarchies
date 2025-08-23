import { type ILinear, LinearQueue, LinearStack, type Some, Stack, type TryResult } from '@loken/utilities';

import { type IGraphSignal, type TraversalType } from './graph.types.js';


/**
 * @internal Has some members which must be public for internal use
 *           which should not be used by a consumer.
 */
export class GraphSignal<TNode> implements IGraphSignal<TNode> {

	//#region fields
	#visited?:     Set<TNode>;
	#isDepthFirst: boolean;
	#nodes:        ILinear<TNode>;
	#depth = 0;
	#branchCount:  Stack<number>;
	#depthCount = 0;
	#count = 0;
	#skipped = false;
	//#endregion

	//#region IGraphSignal
	public get depth(): number {
		return this.#depth;
	}

	public get count(): number {
		return this.#count;
	}

	public next(nodes: Some<TNode>): void {
		const count = this.#nodes.attach(nodes);

		if (this.#isDepthFirst && count > 0)
			this.#branchCount.push(count);
	}

	public skip(): void {
		this.#skipped = true;
	}

	public end(): void {
		this.#nodes.clear();
	}
	//endregion

	//#region internal
	constructor(options: { roots: Some<TNode>, detectCycles?: boolean, type?: TraversalType }) {
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

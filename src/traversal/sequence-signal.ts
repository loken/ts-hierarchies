import { type TryResult } from '@loken/utilities';

/**
 * Use this to signal to the traversal what's `next` and what to `skip`.
 */
export interface ISequenceSignal<TEl> {
	/** The source index of the current element. */
	get index(): number;
	/** The number of elements returned so far. */
	get count(): number;

	/** Call this when traversal should continue to a sub sequence of child roots. */
	next(element?: TEl): void;
	/**
	 * Call this when you want to signal that the current element should be skipped,
	 * meaning it will not be part of the output.
	 *
	 * Traversal will still continue to an element passed to
	 * `next` irrespective of calling `skip`.
	 */
	skip(): void;
}

/**
 * @internal Has some members which must be public for internal use
 *           which should not be used by a consumer.
 */
export class SequenceSignal<TEl> implements ISequenceSignal<TEl> {

	//#region fields
	#element?: TEl;
	#index = -1;
	#count = 0;
	#skipped = false;
	//#endregion

	//#region ISequenceSignal
	public get index() {
		return this.#index;
	}

	public get count() {
		return this.#count;
	}

	public next(element?: TEl) {
		this.#element = element;
	}

	public skip() {
		this.#skipped = true;
	}
	//endregion

	//#region internal
	constructor(options: {first: TEl | undefined}) {
		this.#element = options.first;
	}

	public shouldYield(): boolean {
		return !this.#skipped;
	}

	public cleanup(): void {
		if (!this.#skipped)
			this.#count++;
	}

	public tryGetNext(): TryResult<TEl> {
		if (this.#element !== undefined) {
			const element = this.#element;
			this.#skipped = false;
			this.#element = undefined;
			this.#index++;

			return { value: element, success: true };
		}
		else {
			return { success: false };
		}
	}
	//#endregion

}

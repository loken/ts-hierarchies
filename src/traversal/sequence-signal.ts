import { type TryResult, tryResult } from '@loken/utilities';
import type { ISequenceSignal } from './sequence.types.js';


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
	#yielded = false;
	#pruned = false;
	#nextSet = false;
	//#endregion

	//#region ISequenceSignal
	public get index(): number {
		return this.#index;
	}

	public get count(): number {
		return this.#count;
	}

	public next(element?: TEl): void {
		// Mutually exclusive with prune on the same element
		if (this.#pruned)
			throw new Error('Cannot call next() after prune(). prune and next are mutually exclusive for the same element.');

		this.#element = element;
		this.#nextSet = element !== undefined;
	}

	public skip(): void {
		// Mutually exclusive with yield on the same element
		if (this.#yielded)
			throw new Error('Cannot call skip() after yield(). yield and skip are mutually exclusive for the same element.');

		this.#skipped = true;
	}

	public yield(): void {
		if (this.#skipped)
			throw new Error('Cannot call yield() after skip(). yield and skip are mutually exclusive for the same element.');

		this.#yielded = true; // idempotent
	}

	public prune(): void {
		if (this.#nextSet)
			throw new Error('Cannot call prune() after next(). prune and next are mutually exclusive for the same element.');

		this.#pruned = true; // idempotent
	}
	//endregion

	//#region internal
	constructor(options: { first: TEl | undefined }) {
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
			this.#yielded = false;
			this.#pruned = false;
			this.#nextSet = false;
			this.#element = undefined;
			this.#index++;

			return tryResult.succeed(element);
		}
		else {
			return tryResult.fail();
		}
	}
	//#endregion

}

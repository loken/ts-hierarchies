import { type TryResult, tryResult } from '@loken/utilities';
import type { ISequenceSignal } from './sequence.types.ts';


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
	public get index(): number {
		return this.#index;
	}

	public get count(): number {
		return this.#count;
	}

	public next(element?: TEl): void {
		this.#element = element;
	}

	public skip(): void {
		this.#skipped = true;
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

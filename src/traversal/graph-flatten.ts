import { LinearStack, LinearQueue, someToIterable } from '@loken/utilities';

import { GraphSignal } from './graph-signal.ts';
import { type IGraphSignal, type TraversalSignal, type TraversalControl, type TraversalNext, traversalOptions } from './graph.types.ts';


/**
 * Flatten a graph of nodes by traversing the provided `roots` according to the options.
 */
export const flattenGraph = <TNode>(options: TraversalControl<TNode>): TNode[] => {
	if (options.signal !== undefined)
		return flattenGraphSignal(options);
	else
		return flattenGraphNext(options);
};

/** @internalexport */
export const flattenGraphSignal = <TNode>(
	options: TraversalSignal<TNode>,
): TNode[] => {
	const result: TNode[] = [];
	options.traversal = traversalOptions(options.traversal, { includeSelf: true });

	const signal = new GraphSignal<TNode>(options);
	const signalFn = options.signal;

	// Handle includeSelf === false by pre-seeding children of roots without yielding/counting roots
	if (!options.traversal.includeSelf) {
		const seedProxy = Object.create(signal, {
			skip:  { value: () => { /* no-op during seeding */ }, writable: false },
			yield: { value: () => { /* no-op during seeding */ }, writable: false },
		}) as IGraphSignal<TNode>;

		for (const root of someToIterable(options.roots))
			signalFn(root, seedProxy);
	}

	let res = signal.tryGetNext();
	while (res[1]) {
		signalFn(res[0], signal);

		if (signal.shouldYield())
			result.push(res[0]);

		signal.cleanup();

		res = signal.tryGetNext();
	}

	return result;
};

/** @internalexport */
export const flattenGraphNext = <TNode>(
	options: TraversalNext<TNode>,
): TNode[] => {
	const result: TNode[] = [];
	const nextFn = options.next;
	options.traversal = traversalOptions(options.traversal, { includeSelf: true });

	const reverse = options.traversal.siblingOrder === 'reverse';
	const visited = options.traversal.detectCycles ? new Set<TNode>() : undefined;
	const store = options.traversal.type === 'depth-first'
		? new LinearStack<TNode>()
		: new LinearQueue<TNode>();

	if (options.traversal.includeSelf) {
		store.attach(options.roots, reverse);
	}
	else {
		for (const root of someToIterable(options.roots)) {
			const children = nextFn(root);
			if (children)
				store.attach(children, reverse);
		}
	}

	while (store.count > 0) {
		const node = store.detach()!;

		if (visited?.has(node))
			continue;

		visited?.add(node);

		result.push(node);

		const children = nextFn(node);

		if (children)
			store.attach(children);
	}

	return result;
};

import { LinearQueue, LinearStack, someToIterable } from '@loken/utilities';

import { GraphSignal } from './graph-signal.js';
import { traversalOptions, type IGraphSignal, type TraversalControl, type TraversalNext, type TraversalSignal } from './graph.types.js';


/**
 * Generate a sequence of nodes by traversing the provided `roots` according to the options.
 */
export const traverseGraph = <TNode>(
	options: TraversalControl<TNode>,
): Generator<TNode, void, undefined> => {
	if (options.signal !== undefined)
		return traverseGraphSignal(options);
	else
		return traverseGraphNext(options);
};

/** @internalexport */
export function* traverseGraphSignal<TNode>(
	options: TraversalSignal<TNode>,
): Generator<TNode, void, unknown> {
	options.traversal = traversalOptions(options.traversal, { includeSelf: true });

	// Ensure GraphSignal sees the same traversal options we decided on here
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
			yield res[0];

		signal.cleanup();

		res = signal.tryGetNext();
	}
}


/** @internalexport */
export function* traverseGraphNext<TNode>(
	options: TraversalNext<TNode>,
): Generator<NonNullable<TNode>, void, unknown> {
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

		yield node;

		const children = nextFn(node);
		if (children)
			store.attach(children, reverse);
	}
}

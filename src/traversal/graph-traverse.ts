import { LinearQueue, LinearStack, someToIterable } from '@loken/utilities';

import { GraphSignal, GraphSignalSeeding } from './graph-signal.js';
import { type TraversalControl, type TraversalNext, type TraversalSignal } from './graph.types.js';
import { traversalOptions } from './graph-traversal-options.js';


/**
 * Generate a sequence of nodes by traversing the given `roots` according to the options.
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
export function* traverseGraphSignal<TNode>(options: TraversalSignal<TNode>): Generator<TNode, void, unknown> {
	const traversal = traversalOptions(options.traversal, { includeSelf: true });
	const signalFn = options.signal;
	let signal: GraphSignal<TNode>;

	if (!traversal.includeSelf) {
		const seeding = new GraphSignalSeeding<TNode>();
		for (const root of someToIterable(options.roots))
			signalFn(root, seeding);

		signal = new GraphSignal<TNode>({ roots: seeding.roots, traversal });
	}
	else {
		signal = new GraphSignal<TNode>({ roots: options.roots, traversal });
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
	const traversal = traversalOptions(options.traversal, { includeSelf: true });

	const reverse = traversal.siblingOrder === 'reverse';
	const visited = traversal.detectCycles ? new Set<TNode>() : undefined;
	const store = traversal.type === 'depth-first'
		? new LinearStack<TNode>()
		: new LinearQueue<TNode>();

	if (traversal.includeSelf) {
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

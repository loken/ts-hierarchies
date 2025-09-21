import { LinearQueue, LinearStack, someToIterable } from '@loken/utilities';

import { GraphSignal, GraphSignalSeeding } from './graph-signal.js';
import { type TraversalControl, type TraversalNext, type TraversalSignal } from './graph.types.js';
import { normalizeDescend } from './traversal-options.js';


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
	const signalFn = options.signal;
	const descend = normalizeDescend(options.descend, { includeSelf: true });
	let signal: GraphSignal<TNode>;

	if (!descend.includeSelf) {
		const seeding = new GraphSignalSeeding<TNode>();
		for (const root of someToIterable(options.roots))
			signalFn(root, seeding);

		signal = new GraphSignal<TNode>({ roots: seeding.roots, descend });
	}
	else {
		signal = new GraphSignal<TNode>({ roots: options.roots, descend });
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
	const descend = normalizeDescend(options.descend, { includeSelf: true });

	const reverse = descend.siblingOrder === 'reverse';
	const visited = descend.detectCycles ? new Set<TNode>() : undefined;
	const store = descend.type === 'depth-first'
		? new LinearStack<TNode>()
		: new LinearQueue<TNode>();

	if (descend.includeSelf) {
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

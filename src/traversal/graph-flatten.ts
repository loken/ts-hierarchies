import { LinearStack, LinearQueue, someToIterable } from '@loken/utilities';

import { GraphSignal, GraphSignalSeeding } from './graph-signal.js';
import { type TraversalSignal, type TraversalControl, type TraversalNext } from './graph.types.js';
import { normalizeDescend } from './traversal-options.js';


/**
 * Flatten a graph of nodes by traversing the given `roots` according to the options.
 */
export const flattenGraph = <TNode>(options: TraversalControl<TNode>): TNode[] => {
	if (options.signal !== undefined)
		return flattenGraphSignal(options);
	else
		return flattenGraphNext(options);
};

/** @internalexport */
export const flattenGraphSignal = <TNode>(options: TraversalSignal<TNode>): TNode[] => {
	const result: TNode[] = [];
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

		result.push(node);

		const children = nextFn(node);
		if (children)
			store.attach(children, reverse);
	}

	return result;
};

import { LinearQueue, LinearStack, type Some } from '@loken/utilities';

import { GraphSignal } from './graph-signal.js';
import { type GraphTraversal, type NextNodes, type SignalNodes, type TraversalType } from './graph.types.js';


/**
 * Generate a sequence of nodes by traversing the provided `roots` according to the options.
 */
export const traverseGraph = <TNode>(options: GraphTraversal<TNode>): Generator<TNode, void, undefined> => {
	if (options.signal !== undefined)
		return traverseGraphSignal(options);
	else
		return traverseGraphNext(options);
};

/** @internalexport */
export function* traverseGraphSignal<TNode>(
	options: {
		roots:         Some<TNode>,
		signal:        SignalNodes<TNode>,
		type?:         TraversalType
		detectCycles?: boolean,
	},
) {
	const signal = new GraphSignal<TNode>(options);
	const signalFn = options.signal;
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
	options: {
		roots:         Some<TNode>,
		next:          NextNodes<TNode>,
		type?:         TraversalType,
		detectCycles?: boolean,
	},
) {
	const visited = options.detectCycles ? new Set<TNode>() : undefined;
	const store = options.type === 'depth-first'
		? new LinearStack<TNode>()
		: new LinearQueue<TNode>();
	store.attach(options.roots);
	const nextFn = options.next;

	while (store.count > 0) {
		const node = store.detach()!;

		if (visited?.has(node))
			continue;

		visited?.add(node);

		yield node;

		const children = nextFn(node);

		if (children)
			store.attach(children);
	}
}

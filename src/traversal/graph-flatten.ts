import { type Some, LinearStack, LinearQueue } from '@loken/utilities';
import { GraphSignal } from './graph-signal.ts';
import type { GraphTraversal, SignalNodes, TraversalType, NextNodes } from './graph.types.ts';


/**
 * Flatten a graph of nodes by traversing the provided `roots` according to the options.
 */
export const flattenGraph = <TNode>(options: GraphTraversal<TNode>): TNode[] => {
	if (options.signal !== undefined)
		return flattenGraphSignal(options);
	else
		return flattenGraphNext(options);
};

/** @internalexport */
export const flattenGraphSignal = <TNode>(
	options: {
		roots:         Some<TNode>,
		signal:        SignalNodes<TNode>,
		detectCycles?: boolean,
		type?:         TraversalType
	},
) => {
	const result: TNode[] = [];
	const signal = new GraphSignal<TNode>(options);
	const signalFn = options.signal;
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
	options: {
		roots:         Some<TNode>,
		next:          NextNodes<TNode>,
		type?:         TraversalType,
		detectCycles?: boolean,
	},
) => {
	const result: TNode[] = [];
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

		result.push(node);

		const children = nextFn(node);

		if (children)
			store.attach(children);
	}

	return result;
};

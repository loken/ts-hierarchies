import { LinearQueue, type Some, LinearStack, type Predicate } from '@loken/utilities';
import type { NextNodes, TraversalType } from './traverse-types.ts';


/**
 * Search a graph of nodes by traversing the provided `roots` according to the options.
 *
 * The search will stop when the first node matching the `match` function is found.
 */
export const searchGraph = <TNode>(
	options: {
		roots:         Some<TNode>,
		next:          NextNodes<TNode>,
		search:        Predicate<TNode>,
		type?:         TraversalType,
		detectCycles?: boolean,
	},
): TNode | undefined => {
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

		if (options.search(node))
			return node;

		const children = nextFn(node);

		store.attach(children);
	}
};

/**
 * Search a graph of nodes by traversing the provided `roots` according to the options.
 *
 * The search is exhaustive and will return all nodes matching the `match` function.
 */
export const searchGraphMany = <TNode>(
	options: {
		roots:         Some<TNode>,
		next:          NextNodes<TNode>,
		search:        Predicate<TNode>,
		type?:         TraversalType,
		detectCycles?: boolean,
	},
): TNode[] => {
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

		if (options.search(node))
			result.push(node);

		const children = nextFn(node);

		store.attach(children);
	}

	return result;
};

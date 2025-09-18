import { LinearQueue, LinearStack, type Predicate } from '@loken/utilities';
import { traversalOptions, type TraversalNext } from './graph.types.ts';


export interface SearchGraph<TNode> extends TraversalNext<TNode> {
	/** The predicate function used to test each node during the search. */
	search: Predicate<TNode>,
}

/**
 * Search a graph of nodes by traversing the provided `roots` according to the options.
 *
 * The search will stop when the first node matching the `search` predicate is found.
 */
export const searchGraph = <TNode>(
	options: SearchGraph<TNode>,
): TNode | void => {
	const traversal = traversalOptions(options.traversal);
	const visited = traversal.detectCycles ? new Set<TNode>() : undefined;
	const store = traversal.type === 'depth-first'
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
		if (children)
			store.attach(children);
	}
};

/**
 * Search a graph of nodes by traversing the provided `roots` according to the options.
 *
 * The search is exhaustive and will return all nodes matching the `search` predicate.
 */
export const searchGraphMany = <TNode>(
	options: SearchGraph<TNode>,
): TNode[] => {
	const traversal = traversalOptions(options.traversal);
	const result: TNode[] = [];
	const visited = traversal.detectCycles ? new Set<TNode>() : undefined;
	const store = traversal.type === 'depth-first'
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

		if (children)
			store.attach(children);
	}

	return result;
};

import { iterateMultiple, type Multiple } from '@loken/utilities';

import { HCNode } from './node.js';


/** Extract the `Item` from each of the `nodes`. */
export const nodesToItems = <Item>(nodes: Multiple<HCNode<Item>>) => {
	const items: Item[] = [];

	for (const node of iterateMultiple(nodes))
		items.push(node.item);

	return items;
};

/** Extract the `Id` from the `node.item`. */
export const nodeToId = <Item, Id = Item>(node: HCNode<Item>, identify?: (item: Item) => Id): Id => {
	return identify?.(node.item) ?? node.item as any;
};

/** Extract the `Id` from each `node.item`. */
export const nodesToIds = <Item, Id = Item>(nodes: Multiple<HCNode<Item>>, identify?: (item: Item) => Id): Id[] => {
	const ids: Id[] = [];

	for (const node of iterateMultiple(nodes))
		ids.push(identify?.(node.item) ?? node.item as any);

	return ids;
};

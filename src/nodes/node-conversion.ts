import { type Multiple } from '@loken/utilities';

import { HCNode } from './node.js';


/** Extract the `Item` from each of the `nodes`. */
export const nodesToItems = <Item>(nodes: Multiple<HCNode<Item>>): Item[] => {
	if (Array.isArray(nodes))
		return nodes.map(node => node.item);
	if (nodes instanceof Set)
		return Array.from(nodes, node => node.item);
	if (typeof nodes === 'object' && nodes !== null && Symbol.iterator in nodes)
		return Array.from(nodes, node => node.item);

	return [ nodes.item ]; // single node
};

/** Extract the `Id` from the `node.item`. */
export const nodeToId = <Item, Id = Item>(node: HCNode<Item>, identify?: (item: Item) => Id): Id => {
	return identify?.(node.item) ?? node.item as unknown as Id;
};

/** Extract the `Id` from each `node.item`. */
export const nodesToIds = <Item, Id = Item>(nodes: Multiple<HCNode<Item>>, identify?: (item: Item) => Id): Id[] => {
	if (Array.isArray(nodes))
		return nodes.map(node => identify?.(node.item) ?? node.item as unknown as Id);
	if (nodes instanceof Set)
		return Array.from(nodes, node => identify?.(node.item) ?? node.item as unknown as Id);
	if (typeof nodes === 'object' && nodes !== null && Symbol.iterator in nodes)
		return Array.from(nodes, node => identify?.(node.item) ?? node.item as unknown as Id);

	return [ identify?.(nodes.item) ?? nodes.item as unknown as Id ]; // single node
};

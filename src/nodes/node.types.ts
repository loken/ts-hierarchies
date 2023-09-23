import type { HCNode } from './node.js';

/**
 * Delegate that can be called in order to remove the "brand" from
 * the node that returned this delegate when it was branded.
 */
export type DeBrand = () => void;


/** Predicate which determines whether the `node` is a match. */
export type NodePredicate<Item> = (node: HCNode<Item>) => boolean;

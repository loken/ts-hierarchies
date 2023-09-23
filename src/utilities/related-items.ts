import type { Identify } from './identify.js';

/** Get any child `Item`s related to the `item`. */
export type GetChildren<Item> = (item: Item) => Item[] | undefined;

/** Get the parent `Item` related to the `item`, if it has one. */
export type GetParent<Item> = (item: Item) => Item | undefined;


/** Get the `Id`s of any children of the `item`. */
export type IdentifyChildren<Item, Id> = Identify<Item, Id[] | undefined>;

/** Get the `Id` of the parent of the `item`, if it has one. */
export type IdentifyParent<Item, Id> = Identify<Item, Id | undefined>;

/** Means of getting an `Id` for an `Item`. */
export type Identify<Item, Id> = (item: Item) => Id;

/** Means of getting multiple `Id`s related to an `item`.  */
export type IdentifyMany<Item, Id> = (item: Item) => Id[];

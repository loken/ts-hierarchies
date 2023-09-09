/** @internalexport */
export type TransformTuple<T extends readonly any[], V> = {
	[K in keyof T]: V;
};

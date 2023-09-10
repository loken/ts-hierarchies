import { MultiMap } from '@loken/utilities';
import { assert, expect, test } from 'vitest';

import { nodesToIds } from '../nodes/node-conversion.js';
import { Nodes } from '../nodes/nodes.js';
import { Hierarchies } from './hierarchies.js';

test('Can attach nodes from roots down', () => {
	const hc = Hierarchies.createForIds<string>();

	hc.attachRoot(Nodes.create('A'));
	hc.attach('A', Nodes.create('A1'));
	hc.attach('A', Nodes.create('A2'));
	hc.attach('A2', Nodes.create('A21'));
	hc.attachRoot(Nodes.create('B'));
	hc.attach('B', Nodes.create('B1'));
	hc.attach('B1', Nodes.create('B11'));

	expect(hc.roots.length).toEqual(2);
	expect(nodesToIds(hc.roots)).toEqual([ 'A', 'B' ]);
});

test('hc.attach() to non-existent parent throws', () => {
	const hc = Hierarchies.createForIds<string>();

	assert.throws(() => hc.attach('non-existent-parent-id', Nodes.create('Child')));
});

test('hc.attach() to pre-built root', () => {
	const node = Nodes.create('A').attach(Nodes.create('A1', 'A2'));

	const hc = Hierarchies.createForIds<string>().attachRoot(node);

	expect(nodesToIds(hc.roots)).toEqual([ 'A' ]);
});

test('hc.attach() to multiple hierarchies throws', () => {
	const hcA = Hierarchies.createWithIds(MultiMap.parse(`A:A1,A2`));
	const hcB = Hierarchies.createWithIds(MultiMap.parse('B'));

	const [ a, a1 ] = hcA.getNodes('A', 'A1');

	assert.throws(() => hcB.attachRoot(a));
	assert.throws(() => hcB.attachRoot(a1));
	assert.throws(() => hcB.attach('B', a));
	assert.throws(() => hcB.attach('B', a));
});

test('node.detach() while in a Hierarchy throws because it is branded', () => {
	const hc = Hierarchies.createWithIds(MultiMap.parse(`A:A1,A2`));

	const [ a, a1 ] = hc.getNodes('A', 'A1');

	assert.throws(() => a.detach(a1));
});

test('node.detachSelf() while in a Hierarchy throws because it is branded', () => {
	const hc = Hierarchies.createWithIds(MultiMap.parse(`A:A1,A2`));

	const [ a1 ] = hc.getNodes('A', 'A1');

	assert.throws(() => a1.detachSelf());
});

test('Move a branch from one hierarchy to another using hc.detach() and hc.attachRoot()', () => {
	const hcA = Hierarchies.createWithIds(MultiMap.parse(`A:A1,A2`));
	const hcB = Hierarchies.createWithIds(MultiMap.parse('B'));

	const [ a1 ] = hcA.getNodes('A1');

	hcA.detach(a1);
	hcB.attachRoot(a1);
});

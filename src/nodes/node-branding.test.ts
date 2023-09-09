import { assert, test } from 'vitest';

import { Node } from './node.js';


test('Node.attach() unbranded node to a branded node throws', () => {
	const a = new Node('A');
	const b = new Node('B');

	a.brand('some-brand');

	assert.throws(() => a.attach(b));
	assert.throws(() => b.attach(a));
});

test('Node.attach() nodes with different brands throws', () => {
	const a = new Node('A');
	const b = new Node('B');

	a.brand('some-brand');
	b.brand('other-brand');

	assert.throws(() => a.attach(b));
	assert.throws(() => b.attach(a));
});

test('Node.detach() branded node throws', () => {
	const a = new Node('A');
	const b = new Node('B');

	a.brand('some-brand');
	b.brand('some-brand');

	a.attach(b);

	assert.throws(() => a.detach(b));
});

test('Node.detach() after DeBranding a branded node works.', () => {
	const a = new Node('A');
	const b = new Node('B');

	a.brand('some-brand');
	const deBrandB = b.brand('some-brand');

	a.attach(b);

	// We only need to debrand the node we're going to detach,
	// not the node we're detaching from!
	deBrandB();

	a.detach(b);
});

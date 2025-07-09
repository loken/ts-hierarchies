import { assert, expect, test } from 'vitest';

import { Nodes } from './nodes.js';


// Basic branding functionality tests
test('node.brand() with undefined throws', () => {
	const a = Nodes.create('A');

	assert.throws(() => a.brand(undefined), /The brand cannot be 'undefined'/);
});

test('node.brand() twice without debranding throws', () => {
	const a = Nodes.create('A');

	a.brand('first-brand');

	assert.throws(() => a.brand('second-brand'), /Must clear existing brand using the 'DeBrand' delegate before you can re-brand a node/);
});

test('node.brand() and debrand cycle works', () => {
	const a = Nodes.create('A');

	// Should be able to brand and debrand
	const debrand = a.brand('some-brand');
	expect(a.isBranded).to.be.true;
	debrand();
	expect(a.isBranded).to.be.false;

	// Should be able to brand again after debranding
	const debrand2 = a.brand('new-brand');
	expect(a.isBranded).to.be.true;
	debrand2();
	expect(a.isBranded).to.be.false;
});

test('debranding twice is safe', () => {
	const a = Nodes.create('A');

	const debrand = a.brand('some-brand');

	debrand();
	debrand(); // Should not throw
});


// Brand value type tests
test('node.brand() with null works', () => {
	const a = Nodes.create('A');

	const debrand = a.brand(null);
	expect(a.isBranded).to.be.true;

	debrand();
	expect(a.isBranded).to.be.false;
});

test('node.brand() with empty string works', () => {
	const a = Nodes.create('A');

	const debrand = a.brand('');
	expect(a.isBranded).to.be.true;

	debrand();
	expect(a.isBranded).to.be.false;
});

test('node.brand() with number works', () => {
	const a = Nodes.create('A');

	const debrand = a.brand(42);
	expect(a.isBranded).to.be.true;

	debrand();
	expect(a.isBranded).to.be.false;
});

test('node.brand() with object works', () => {
	const a = Nodes.create('A');
	const brandObject = { name: 'test-brand' };

	const debrand = a.brand(brandObject);
	expect(a.isBranded).to.be.true;

	debrand();
	expect(a.isBranded).to.be.false;
});


// Brand compatibility tests
test('isBrandCompatible() unbranded nodes are compatible', () => {
	const [ a, b ] = Nodes.create('A', 'B');

	expect(a.isBrandCompatible(b)).to.be.true;
	expect(b.isBrandCompatible(a)).to.be.true;
});

test('isBrandCompatible() same brand nodes are compatible', () => {
	const [ a, b ] = Nodes.create('A', 'B');

	a.brand('same-brand');
	b.brand('same-brand');

	expect(a.isBrandCompatible(b)).to.be.true;
	expect(b.isBrandCompatible(a)).to.be.true;
});

test('isBrandCompatible() different brand nodes are incompatible', () => {
	const [ a, b ] = Nodes.create('A', 'B');

	a.brand('brand-a');
	b.brand('brand-b');

	expect(a.isBrandCompatible(b)).to.be.false;
	expect(b.isBrandCompatible(a)).to.be.false;
});

test('isBrandCompatible() branded and unbranded nodes are incompatible', () => {
	const [ a, b ] = Nodes.create('A', 'B');

	a.brand('some-brand');
	// b remains unbranded

	expect(a.isBrandCompatible(b)).to.be.false;
	expect(b.isBrandCompatible(a)).to.be.false;
});


test('node.attach() unbranded nodes works', () => {
	const [ a, b ] = Nodes.create('A', 'B');

	// Should work fine - both unbranded
	a.attach(b);

	expect(b.parent).toBe(a);
	expect(a.children).toContain(b);
});

test('node.attach() same brand nodes works', () => {
	const [ a, b ] = Nodes.create('A', 'B');

	a.brand('same-brand');
	b.brand('same-brand');

	// Should work fine - same brand
	a.attach(b);

	expect(b.parent).toBe(a);
	expect(a.children).toContain(b);
});


test('node.attach() unbranded node to a branded node throws', () => {
	const [ a, b ] = Nodes.create('A', 'B');

	a.brand('some-brand');

	assert.throws(() => a.attach(b));
	assert.throws(() => b.attach(a));
});

test('node.attach() nodes with different brands throws', () => {
	const [ a, b ] = Nodes.create('A', 'B');

	a.brand('some-brand');
	b.brand('other-brand');

	assert.throws(() => a.attach(b));
	assert.throws(() => b.attach(a));
});

test('node.detach() branded node throws', () => {
	const [ a, b ] = Nodes.create('A', 'B');

	a.brand('some-brand');
	b.brand('some-brand');

	a.attach(b);

	assert.throws(() => a.detach(b));
});

test('node.detach() after debranding a branded node works', () => {
	const [ a, b ] = Nodes.create('A', 'B');

	a.brand('some-brand');
	const deBrandB = b.brand('some-brand');

	a.attach(b);

	// We only need to debrand the node we're going to detach,
	// not the node we're detaching from!
	deBrandB();

	a.detach(b);
});


// Complex scenarios
test('debranding in middle of hierarchy allows restructuring', () => {
	const [ a, b, c ] = Nodes.create('A', 'B', 'C');

	const _debrandA = a.brand('hierarchy-1');
	const debrandB = b.brand('hierarchy-1');
	const _debrandC = c.brand('hierarchy-1');

	// Build: A -> B -> C
	a.attach(b);
	b.attach(c);

	// Debrand B so we can move it
	debrandB();

	// Now B can be detached and moved
	a.detach(b);

	// C should still be attached to B
	expect(c.parent).toBe(b);
	expect(b.children).toContain(c);
});

test('multiple brand cycles work correctly', () => {
	const [ a, b ] = Nodes.create('A', 'B');

	// First cycle
	const debrand1A = a.brand('brand-1');
	const debrand1B = b.brand('brand-1');
	a.attach(b);
	debrand1B();
	a.detach(b);
	debrand1A();

	// Second cycle with different brand
	const debrand2A = a.brand('brand-2');
	const debrand2B = b.brand('brand-2');
	a.attach(b);
	debrand2B();
	a.detach(b);
	debrand2A();

	// Should work without issues
	expect(a.isRoot).to.be.true;
	expect(b.isRoot).to.be.true;
});

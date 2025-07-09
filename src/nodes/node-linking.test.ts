import { expect, test } from 'vitest';

import { type HCNode } from './node.js';
import { Nodes } from './nodes.js';


test('node.attach() links both ways', () => {
	const [ root, child ] = Nodes.create('root', 'child');

	root.attach(child);

	expect(root.isLinked).to.be.true;
	expect(root.isLeaf).to.be.false;

	expect(child.isLinked).to.be.true;
	expect(child.isRoot).to.be.false;
});

test('node.detach() unlinks both ways', () => {
	const [ root, child ] = Nodes.create('root', 'child');

	root.attach(child);
	root.detach(child);

	expect(root.isLinked).to.be.false;
	expect(child.isLinked).to.be.false;
});

test('node.detachSelf() unlinks both ways', () => {
	const [ root, child ] = Nodes.create('root', 'child');

	root.attach(child);
	child.detachSelf();

	expect(root.isLinked).to.be.false;
	expect(child.isLinked).to.be.false;
});

test('node.dismantle(false) unlinks everything under the node.', () => {
	const branchA = Nodes.create('A').attach([ Nodes.create('a1'), Nodes.create('a2'), Nodes.create('a3').attach(Nodes.create('a31')) ]);
	const branchB = Nodes.create('A').attach([ Nodes.create('b1'), Nodes.create('b2').attach(Nodes.create('b21')) ]);
	const root = Nodes.create('root').attach([ branchA, branchB ]);

	const descendantsOfA = branchA.getDescendants();
	const other = root.getDescendants().filter(n => !n.item.startsWith('a'));

	branchA.dismantle(false);

	// The branch that was dismantled is now a leaf, but not a root as it's still connected to it's parent.
	expect(branchA.isLeaf).to.be.true;
	expect(branchA.isRoot).to.be.false;
	expect(branchA.parent).toEqual(root);
	expect(branchB.parent).toEqual(root);

	// The descendants of the branch however are no longer linked.
	expect(descendantsOfA).to.satisfy((nodes: HCNode<number>[]) => nodes.every(n => !n.isLinked));

	// All of the other nodes are still linked in some way.
	expect(other).to.satisfy((nodes: HCNode<number>[]) => nodes.every(n => n.isLinked));
});

test('node.dismantle(true) unlinks everything, including the ancestry and its branches.', () => {
	const branchA = Nodes.create('A').attach([ Nodes.create('a1'), Nodes.create('a2'), Nodes.create('a3').attach(Nodes.create('a31')) ]);
	const branchB = Nodes.create('A').attach([ Nodes.create('b1'), Nodes.create('b2').attach(Nodes.create('b21')) ]);
	const root = Nodes.create('root').attach([ branchA, branchB ]);

	const nodes = root.getDescendants(true);

	expect(nodes.length).to.equal(10);

	// By picking a branch we assert that we dismantle children, parents and siblings.
	branchA.dismantle(true);

	expect(nodes).to.satisfy((nodes: HCNode<number>[]) => nodes.every(n => !n.isLinked));
});

import { expect, test } from 'vitest';

import { HCNode } from './node.js';


test('node.attach() links both ways', () => {
	const root = new HCNode('root');
	const child = new HCNode('child');

	root.attach(child);

	expect(root.isLinked).to.be.true;
	expect(root.isLeaf).to.be.false;

	expect(child.isLinked).to.be.true;
	expect(child.isRoot).to.be.false;
});

test('node.detach() unlinks both ways', () => {
	const root = new HCNode('root');
	const child = new HCNode('child');

	root.attach(child);
	root.detach(child);

	expect(root.isLinked).to.be.false;
	expect(child.isLinked).to.be.false;
});

test('node.detachSelf() unlinks both ways', () => {
	const root = new HCNode('root');
	const child = new HCNode('child');

	root.attach(child);
	child.detachSelf();

	expect(root.isLinked).to.be.false;
	expect(child.isLinked).to.be.false;
});

test('node.dismantle(false) unlinks everything under the node.', () => {
	const branchA = new HCNode('A').attach([ new HCNode('a1'), new HCNode('a2'), new HCNode('a3').attach(new HCNode('a31')) ]);
	const branchB = new HCNode('A').attach([ new HCNode('b1'), new HCNode('b2').attach(new HCNode('b21')) ]);
	const root = new HCNode('root').attach([ branchA, branchB ]);

	const descendantsOfA = branchA.getDescendants({ excludeSelf: true });
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
	const branchA = new HCNode('A').attach([ new HCNode('a1'), new HCNode('a2'), new HCNode('a3').attach(new HCNode('a31')) ]);
	const branchB = new HCNode('A').attach([ new HCNode('b1'), new HCNode('b2').attach(new HCNode('b21')) ]);
	const root = new HCNode('root').attach([ branchA, branchB ]);

	const nodes = root.getDescendants();

	expect(nodes.length).to.equal(10);

	// By picking a branch we assert that we dismantle children, parents and siblings.
	branchA.dismantle(true);

	expect(nodes).to.satisfy((nodes: HCNode<number>[]) => nodes.every(n => !n.isLinked));
});

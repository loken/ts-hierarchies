import { expect, test } from 'vitest';

import { Node } from './node.js';


test('Node.attach() links both ways', () => {
	const root = new Node('root');
	const child = new Node('child');

	root.attach(child);

	expect(root.isLinked).to.be.true;
	expect(root.isLeaf).to.be.false;

	expect(child.isLinked).to.be.true;
	expect(child.isRoot).to.be.false;
});

test('Node.detach() unlinks both ways', () => {
	const root = new Node('root');
	const child = new Node('child');

	root.attach(child);
	root.detach(child);

	expect(root.isLinked).to.be.false;
	expect(child.isLinked).to.be.false;
});

test('Node.detachSelf() unlinks both ways', () => {
	const root = new Node('root');
	const child = new Node('child');

	root.attach(child);
	child.detachSelf();

	expect(root.isLinked).to.be.false;
	expect(child.isLinked).to.be.false;
});

test('Node.dismantle(false) unlinks everything under the node.', () => {
	const branchA = new Node('A').attach([ new Node('a1'), new Node('a2'), new Node('a3').attach(new Node('a31')) ]);
	const branchB = new Node('A').attach([ new Node('b1'), new Node('b2').attach(new Node('b21')) ]);
	const root = new Node('root').attach([ branchA, branchB ]);

	const descendantsOfA = branchA.getDescendants({ excludeSelf: true });
	const other = root.getDescendants().filter(n => !n.item.startsWith('a'));

	branchA.dismantle(false);

	// The branch that was dismantled is now a leaf, but not a root as it's still connected to it's parent.
	expect(branchA.isLeaf).to.be.true;
	expect(branchA.isRoot).to.be.false;
	expect(branchA.parent).toEqual(root);
	expect(branchB.parent).toEqual(root);

	// The descendants of the branch however are no longer linked.
	expect(descendantsOfA).to.satisfy((nodes: Node<number>[]) => nodes.every(n => !n.isLinked));

	// All of the other nodes are still linked in some way.
	expect(other).to.satisfy((nodes: Node<number>[]) => nodes.every(n => n.isLinked));
});

test('Node.dismantle(true) unlinks everything, including the ancestry and its branches.', () => {
	const branchA = new Node('A').attach([ new Node('a1'), new Node('a2'), new Node('a3').attach(new Node('a31')) ]);
	const branchB = new Node('A').attach([ new Node('b1'), new Node('b2').attach(new Node('b21')) ]);
	const root = new Node('root').attach([ branchA, branchB ]);

	const nodes = root.getDescendants();

	expect(nodes.length).to.equal(10);

	// By picking a branch we assert that we dismantle children, parents and siblings.
	branchA.dismantle(true);

	expect(nodes).to.satisfy((nodes: Node<number>[]) => nodes.every(n => !n.isLinked));
});

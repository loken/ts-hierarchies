import { describe, it, expect } from 'vitest';
import { HCNode } from './node';


describe('HCNode.children tampering', () => {
	it('throws when attempting to mutate the children array', () => {
		const parent = new HCNode('Parent');
		const child1 = new HCNode('Child1');
		const child2 = new HCNode('Child2');
		parent.attach([ child1, child2 ]);
		const children = parent.children;

		expect(Object.isFrozen(children)).toBe(true);
		expect(() => { children.push(new HCNode('Malicious')); }).toThrow();
		expect(() => { children.pop(); }).toThrow();
		expect(() => { children.splice(0, 1); }).toThrow();
		expect(() => { children[0] = new HCNode('Malicious'); }).toThrow();
		expect(() => { children.length = 0; }).toThrow();
		expect(() => { delete children[0]; }).toThrow();
	});
});

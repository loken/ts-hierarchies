# Copilot Instructions for ts-hierarchies

## Project Overview
- .NET 8 Library for working with hierarchies of identifiers and identifiable objects, typically representing tree structures from databases or in-memory collections.
- Core abstractions: `Hierarchy`, `Hierarchies`, `HCNode`, `Relation`, and `MultiMap`.
- Hierarchies can be constructed from relations, child maps, or item lists using flexible options and delegates.
- The codebase is modular, with key logic in `src/hierarchies/`, `src/nodes/`, `src/traversal/`, and `src/utilities/`.

## Key Patterns & Conventions
- **Hierarchy Construction:**
  - Use `Hierarchies.createWithItems` or `Hierarchies.createWithIds` for building hierarchies from items or relations.
  - Relations are typically arrays of `Relation<Id>` or a `MultiMap<Id>`.
  - Item identification uses an `identify(item)` delegate.
- **Node Wrapping:**
  - Items are wrapped in `HCNode<Item>` for graph traversal and linking.
  - Nodes track parent/child relationships and support root/leaf/internal checks.
- **Traversal & Search:**
  - Traversal logic is split between graph and sequence algorithms in `src/traversal/`.
  - Use `traverseGraph` and `traverseSequence` for generator-based traversal (with `next` or `signal` options).
  - Use `flattenGraph` / `flattenSequence` to collect results eagerly into arrays.
  - Use `searchGraph` / `searchGraphMany` and `searchSequence` / `searchSequenceMany` for queries.
- **TypeScript Types:**
  - Key types: `Identify<Item, Id>`, `Relation<Id>`, `IdSpec<Id>`, `ItemIdOptions<Item, Id>`.
  - Be explicit with return types.

## Developer Workflows
- **Build:** Use `pnpm install` and `pnpm build` (see `package.json` scripts).
- **Test:** Run `pnpm test` for unit tests (test files are co-located with source files, e.g., `*.test.ts`).
- **Debug:** Use TypeScript source maps and test files for step-through debugging.
- **Benchmarks:** Performance tests are in `src/traversal/*.bench.ts`.

## Linting & Formatting Conventions
- **Tabs over spaces:** All TypeScript and test files use tabs for indentation. Do not convert to spaces.
- **Trailing commas:** Required in multiline arrays, objects, and parameter lists (`@stylistic/comma-dangle: always-multiline`).
- **Line length:** Maximum 155 characters with exceptions for imports, strings, and comments.
- **Quotes:** Single quotes preferred, template literals and escape avoidance allowed.
- **Punctuation:** Use straight ASCII apostrophes (') and hyphens (-). Do not use typographic/curly quotes or em/en dashes in code or docs. Apply this to all generated content and examples.
- **Spacing:** Array brackets spaced `[ item ]`, object braces spaced `{ key: value }`.
- **Semicolons:** Always required.
- **Returns:** Always use a new line before returns.
- **Empty lines:** Never include whitespace on empty lines.

## Integration Points
- Depends on `@loken/utilities` for core data structures (`MultiMap`, etc.).
- Designed for compatibility with other Loken hierarchy libraries (see .NET sibling repo for cross-language patterns).

## .NET vs TypeScript Implementation Differences
- **Discoverability Pattern:** While the .NET sibling repo uses extension methods for discoverability, this TypeScript implementation uses static methods on `Nodes` and `Hierarchies` classes (e.g., `Nodes.create()`, `Hierarchies.createWithIds()`).
- **API Surface:** TypeScript version emphasizes functional patterns with static factory methods, while .NET uses more traditional OOP with extension methods.

## Project-Specific Advice
- **Node Branding:** Nodes can be "branded" with ownership tokens. Branded nodes can only be attached to nodes with compatible brands. Hierarchies automatically brand their nodes to prevent cross-hierarchy contamination. The `brand()` method returns a `DeBrand` delegate for cleanup.
- Serialization/deserialization of relations and child maps is supported via `MultiMap.parse` and `MultiMap.render`.
- Tests should use realistic relation and item structures as shown in existing test files.
- Test primarily on the `Node` level and don't create duplicate tests for methods which essentially are convenience wrappers, such as overloads or `Hierarchy<,>` variants.

## Key Files
- `src/hierarchies/hierarchies.ts`, `src/hierarchies/hierarchy.ts`: Core hierarchy logic
- `src/nodes/node.ts`, `src/nodes/nodes.ts`: Node wrapper, factories, and graph helpers
- `src/maps/child-map.ts`: Child map utilities for constructing hierarchies
- `src/relations/`: Relation types and conversions
- `src/traversal/graph-traverse.ts`, `src/traversal/sequence-traverse.ts`: Core traversal generators
- `src/traversal/graph-flatten.ts`, `src/traversal/sequence-flatten.ts`: Eager traversal helpers
- `src/traversal/graph-search.ts`, `src/traversal/sequence-search.ts`: Search helpers

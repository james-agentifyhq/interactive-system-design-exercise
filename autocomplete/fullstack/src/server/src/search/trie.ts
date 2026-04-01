/**
 * Trie (Prefix Tree) — the core data structure for autocomplete.
 *
 * WHY A TRIE?
 * A Trie is the textbook answer for autocomplete because it provides O(L) prefix
 * lookup where L is the length of the query — regardless of how many items are stored.
 * Compare this to linear scan which is O(N) per query.
 *
 * HOW IT WORKS:
 * Each node represents a character. A path from root to a node spells out a prefix.
 * Each node stores a set of item IDs whose names pass through that prefix.
 *
 * Example: inserting "apple" (id=1) and "app" (id=2):
 *
 *   root → a → p → p → l → e
 *                  ↑       ↑
 *               {1,2}     {1}
 *
 * Searching for "app" returns {1, 2}. Searching for "apple" returns {1}.
 *
 * INTERVIEW TIP:
 * This is a common interview question on its own ("implement a Trie").
 * Key operations: insert, search (prefix match), delete.
 * Time: O(L) for insert and search where L = word length.
 * Space: O(N × M) where N = number of words, M = average word length.
 */

interface TrieNode {
  children: Map<string, TrieNode>;
  /** IDs of items whose name contains this prefix */
  itemIds: Set<number>;
  /** True if this node marks the end of a complete word */
  isEndOfWord: boolean;
}

function createNode(): TrieNode {
  return {
    children: new Map(),
    itemIds: new Set(),
    isEndOfWord: false,
  };
}

export class Trie {
  private root: TrieNode = createNode();

  /**
   * Insert a word into the trie and associate it with an item ID.
   *
   * We insert the LOWERCASED version so searches are case-insensitive.
   * Each node along the path stores the item ID, so prefix searches
   * at any depth can find all matching items.
   */
  insert(word: string, itemId: number): void {
    const normalized = word.toLowerCase();
    let current = this.root;

    for (const char of normalized) {
      if (!current.children.has(char)) {
        current.children.set(char, createNode());
      }
      current = current.children.get(char)!;
      // Every node along the path gets this item ID.
      // This is the key insight: when we search for a prefix,
      // we just look at the node at the end of the prefix path
      // and return its itemIds — no further traversal needed.
      current.itemIds.add(itemId);
    }

    current.isEndOfWord = true;
  }

  /**
   * Search for all item IDs matching a given prefix.
   *
   * Time complexity: O(L) where L = prefix length.
   * We simply walk down the trie following the prefix characters.
   * If we reach a node, its itemIds contains ALL items with this prefix.
   */
  search(prefix: string): Set<number> {
    const normalized = prefix.toLowerCase();
    let current = this.root;

    for (const char of normalized) {
      if (!current.children.has(char)) {
        // No items match this prefix
        return new Set();
      }
      current = current.children.get(char)!;
    }

    return current.itemIds;
  }

  /**
   * Check how many total nodes are in the trie (useful for debugging/monitoring).
   */
  get size(): number {
    let count = 0;
    const traverse = (node: TrieNode) => {
      count++;
      for (const child of node.children.values()) {
        traverse(child);
      }
    };
    traverse(this.root);
    return count;
  }
}

# 📘 **MODULE 5: TRIE (PREFIX TREE)**

**Difficulty**: Medium  
**Importance for Node.js**: ⭐⭐⭐⭐ (Search, Autocomplete, Routing)  
**Time to Master**: 1 week  

---

## 🎯 **WHAT IS A TRIE?**

```
A Trie (pronounced "try") is a tree-like data structure used for 
storing strings where each node represents a character.

USE CASES IN NODE.JS:
✅ Search autocomplete (like Google search)
✅ Spell checker
✅ IP routing tables
✅ Phone directory
✅ URL routing in Express
✅ Command completion in CLI tools
```

### **Visual Structure**

```
Insert: "cat", "car", "card", "dog"

        root
       /    \
      c      d
     / \     |
    a   o    o
   / \   |   |
  t   r   g   g
      |
      d

Words: cat (c-a-t), car (c-a-r), card (c-a-r-d), dog (d-o-g)
```

---

## 💻 **TRIE IMPLEMENTATION IN JAVASCRIPT**

```javascript
// ─────────────────────────────────────────────
// TRIE NODE
// ─────────────────────────────────────────────
class TrieNode {
  constructor() {
    this.children = {};      // Map character to child nodes
    this.isEndOfWord = false; // Marks end of a word
  }
}

// ─────────────────────────────────────────────
// TRIE CLASS
// ─────────────────────────────────────────────
class Trie {
  constructor() {
    this.root = new TrieNode();
  }
  
  // ──────────────────────────────────────────
  // INSERT A WORD - O(m) where m = word length
  // ──────────────────────────────────────────
  insert(word) {
    let node = this.root;
    
    for (const char of word) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    
    node.isEndOfWord = true;
  }
  
  // ──────────────────────────────────────────
  // SEARCH FOR EXACT WORD - O(m)
  // ──────────────────────────────────────────
  search(word) {
    const node = this._findNode(word);
    return node !== null && node.isEndOfWord;
  }
  
  // ──────────────────────────────────────────
  // CHECK IF ANY WORD STARTS WITH PREFIX - O(m)
  // ──────────────────────────────────────────
  startsWith(prefix) {
    return this._findNode(prefix) !== null;
  }
  
  // ──────────────────────────────────────────
  // HELPER: Find node for a word/prefix
  // ──────────────────────────────────────────
  _findNode(str) {
    let node = this.root;
    
    for (const char of str) {
      if (!node.children[char]) {
        return null;
      }
      node = node.children[char];
    }
    
    return node;
  }
  
  // ──────────────────────────────────────────
  // DELETE A WORD - O(m)
  // ──────────────────────────────────────────
  delete(word) {
    this._delete(this.root, word, 0);
  }
  
  _delete(node, word, index) {
    if (index === word.length) {
      if (!node.isEndOfWord) return false;
      node.isEndOfWord = false;
      return Object.keys(node.children).length === 0;
    }
    
    const char = word[index];
    const child = node.children[char];
    
    if (!child) return false;
    
    const shouldDeleteChild = this._delete(child, word, index + 1);
    
    if (shouldDeleteChild) {
      delete node.children[char];
      return Object.keys(node.children).length === 0 && !node.isEndOfWord;
    }
    
    return false;
  }
  
  // ──────────────────────────────────────────
  // GET ALL WORDS WITH PREFIX - O(m + k)
  // k = number of words with given prefix
  // ──────────────────────────────────────────
  getWordsWithPrefix(prefix) {
    const results = [];
    const node = this._findNode(prefix);
    
    if (!node) return results;
    
    this._dfs(node, prefix, results);
    return results;
  }
  
  _dfs(node, prefix, results) {
    if (node.isEndOfWord) {
      results.push(prefix);
    }
    
    for (const [char, child] of Object.entries(node.children)) {
      this._dfs(child, prefix + char, results);
    }
  }
}

// ─────────────────────────────────────────────
// USAGE EXAMPLE
// ─────────────────────────────────────────────
const trie = new Trie();

// Insert words
trie.insert('apple');
trie.insert('app');
trie.insert('application');
trie.insert('apply');
trie.insert('banana');

// Search
console.log(trie.search('app'));        // true
console.log(trie.search('apple'));      // true
console.log(trie.search('apples'));     // false

// Prefix check
console.log(trie.startsWith('app'));    // true
console.log(trie.startsWith('ban'));    // true
console.log(trie.startsWith('cat'));    // false

// Get all words with prefix
console.log(trie.getWordsWithPrefix('app'));
// ['app', 'apple', 'application', 'apply']

// Delete
trie.delete('app');
console.log(trie.search('app'));        // false
console.log(trie.search('apple'));      // true (still exists)
```

---

## 🚀 **REAL-WORLD NODE.JS APPLICATIONS**

### **1. Search Autocomplete API**

```javascript
// ─────────────────────────────────────────────
// EXPRESS ROUTE WITH TRIE AUTOCOMPLETE
// ─────────────────────────────────────────────
const express = require('express');
const app = express();

// Initialize Trie with product database
const productTrie = new Trie();
const products = [
  'laptop', 'laptop stand', 'laptop bag',
  'phone', 'phone case', 'phone charger',
  'tablet', 'table lamp',
  'headphones', 'headset',
];

// Pre-load products into Trie
products.forEach(product => productTrie.insert(product.toLowerCase()));

// Autocomplete endpoint
app.get('/api/autocomplete', (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 2) {
    return res.json({ suggestions: [] });
  }
  
  const suggestions = productTrie.getWordsWithPrefix(q.toLowerCase());
  
  res.json({
    query: q,
    suggestions: suggestions.slice(0, 5),  // Limit to 5 suggestions
  });
});

// Example request: GET /api/autocomplete?q=lap
// Response: { query: "lap", suggestions: ["laptop", "laptop bag", "laptop stand"] }

app.listen(3000, () => {
  console.log('Autocomplete API running on port 3000');
});
```

### **2. URL Router (Mini Express)**

```javascript
// ─────────────────────────────────────────────
// SIMPLE ROUTER USING TRIE
// ─────────────────────────────────────────────
class Router {
  constructor() {
    this.routes = new Trie();
    this.handlers = new Map();
  }
  
  // Register route
  register(method, path, handler) {
    const key = `${method}:${path}`;
    this.routes.insert(key);
    this.handlers.set(key, handler);
  }
  
  // Find matching route
  match(method, path) {
    // Exact match
    const key = `${method}:${path}`;
    if (this.routes.search(key)) {
      return this.handlers.get(key);
    }
    
    // Could extend for parameterized routes like /users/:id
    return null;
  }
}

// Usage
const router = new Router();

router.register('GET', '/users', (req, res) => {
  res.json({ message: 'Get all users' });
});

router.register('POST', '/users', (req, res) => {
  res.json({ message: 'Create user' });
});

router.register('GET', '/users/:id', (req, res) => {
  res.json({ message: `Get user ${req.params.id}` });
});
```

### **3. Spell Checker Middleware**

```javascript
// ─────────────────────────────────────────────
// SPELL CHECKER MIDDLEWARE
// ─────────────────────────────────────────────
class SpellChecker {
  constructor(dictionary) {
    this.trie = new Trie();
    dictionary.forEach(word => this.trie.insert(word.toLowerCase()));
  }
  
  // Check if word exists
  isCorrect(word) {
    return this.trie.search(word.toLowerCase());
  }
  
  // Suggest corrections (words with similar prefix)
  suggest(word) {
    const prefix = word.slice(0, 3);
    return this.trie.getWordsWithPrefix(prefix).slice(0, 5);
  }
}

// Express middleware
function createSpellCheckerMiddleware(dictionary) {
  const checker = new SpellChecker(dictionary);
  
  return (req, res, next) => {
    // Add spell checker to request
    req.spellCheck = {
      isCorrect: (word) => checker.isCorrect(word),
      suggest: (word) => checker.suggest(word),
    };
    next();
  };
}

// Usage
const commonWords = ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'for'];

app.use(createSpellCheckerMiddleware(commonWords));

app.post('/api/comment', (req, res) => {
  const { text } = req.body;
  const words = text.split(' ');
  
  const misspelled = words.filter(word => !req.spellCheck.isCorrect(word));
  
  if (misspelled.length > 0) {
    const suggestions = {};
    misspelled.forEach(word => {
      suggestions[word] = req.spellCheck.suggest(word);
    });
    
    return res.status(400).json({
      error: 'Possible spelling errors',
      misspelled,
      suggestions,
    });
  }
  
  res.json({ message: 'Comment posted successfully' });
});
```

---

## 📊 **COMPLEXITY ANALYSIS**

```
┌────────────────────────────────────────────────────────┐
│              TRIE TIME COMPLEXITY                       │
├────────────────────────────────────────────────────────┤
│  Operation        | Time Complexity  | Space           │
├────────────────────────────────────────────────────────┤
│  Insert           | O(m)             | O(m)            │
│  Search           | O(m)             | O(1)            │
│  startsWith       | O(m)             | O(1)            │
│  Delete           | O(m)             | O(1)            │
│  Get suggestions  | O(m + k)         | O(k)            │
├────────────────────────────────────────────────────────┤
│  m = length of word/prefix                             │
│  k = number of suggestions                             │
└────────────────────────────────────────────────────────┘

COMPARISON WITH OTHER DATA STRUCTURES:

Search Operation:
- Array: O(n)
- Hash Map: O(1) but no prefix search
- Binary Search Tree: O(log n) but no prefix search
- Trie: O(m) WITH prefix search support ✅

Space:
- Trie can use more space than Hash Map for sparse data
- But very efficient for storing many words with common prefixes
```

---

## 🎯 **PRACTICE PROBLEMS**

```javascript
// ─────────────────────────────────────────────
// PROBLEM 1: IMPLEMENT TRIE FROM SCRATCH
// ─────────────────────────────────────────────
// (Already implemented above - practice this first!)

// ─────────────────────────────────────────────
// PROBLEM 2: WORD SEARCH II (LeetCode 212)
// ─────────────────────────────────────────────
function findWords(board, words) {
  const result = [];
  const trie = new Trie();
  
  // Insert all words into Trie
  words.forEach(word => trie.insert(word));
  
  const rows = board.length;
  const cols = board[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  
  function dfs(row, col, node, word) {
    if (node.isEndOfWord) {
      result.push(word);
      node.isEndOfWord = false;  // Avoid duplicates
    }
    
    if (row < 0 || row >= rows || col < 0 || col >= cols) return;
    if (visited[row][col]) return;
    if (!node.children[board[row][col]]) return;
    
    visited[row][col] = true;
    const char = board[row][col];
    dfs(row + 1, col, node.children[char], word + char);
    dfs(row - 1, col, node.children[char], word + char);
    dfs(row, col + 1, node.children[char], word + char);
    dfs(row, col - 1, node.children[char], word + char);
    visited[row][col] = false;
  }
  
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      dfs(i, j, trie.root, '');
    }
  }
  
  return result;
}

// ─────────────────────────────────────────────
// PROBLEM 3: REPLACE WORDS (LeetCode 648)
// ─────────────────────────────────────────────
function replaceWords(dictionary, sentence) {
  const trie = new Trie();
  dictionary.forEach(word => trie.insert(word));
  
  return sentence.split(' ').map(word => {
    // Find shortest root
    for (let i = 1; i <= word.length; i++) {
      const prefix = word.slice(0, i);
      if (trie.search(prefix)) {
        return prefix;
      }
    }
    return word;
  }).join(' ');
}

// Example:
// dictionary = ["cat", "bat", "rat"]
// sentence = "the cattle was rattled by the battery"
// Output: "the cat was rat by the bat"
```

---

## ✅ **INTERVIEW CHECKLIST**

```
Trie Mastery Checklist:
[ ] Understand Trie structure and when to use
[ ] Implement Trie from scratch without bugs
[ ] Implement insert, search, startsWith
[ ] Implement delete operation
[ ] Implement prefix-based suggestions
[ ] Solve Word Search II problem
[ ] Understand time/space complexity
[ ] Know real-world applications (autocomplete, spell check)
```

---

## 📚 **ADDITIONAL RESOURCES**

- **LeetCode 208**: Implement Trie (Prefix Tree)
- **LeetCode 212**: Word Search II
- **LeetCode 648**: Replace Words
- **LeetCode 211**: Design Add and Search Words Data Structure

---

**Next**: Continue with Bit Manipulation, Advanced Graph Algorithms, and System Design for Node.js

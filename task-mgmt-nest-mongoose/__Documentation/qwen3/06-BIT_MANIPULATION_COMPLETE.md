# 📘 **MODULE 6: BIT MANIPULATION**

**Difficulty**: Medium  
**Importance for Node.js**: ⭐⭐⭐ (Performance optimization, flags, permissions)  
**Time to Master**: 1 week  
- [LastRead](#lastRead)
---

## 🎯 **WHY BIT MANIPULATION MATTERS FOR NODE.JS**

```
REAL-WORLD USE CASES:
✅ Permission flags (read=1, write=2, execute=4)
✅ Feature toggles (multiple booleans in one number)
✅ Database indexing optimization
✅ Caching strategies (LRU cache uses bit operations)
✅ Compression algorithms
✅ Encryption and security
✅ Performance-critical code paths
```

---

## 📖 **BITWISE OPERATORS EXPLAINED**

```javascript
// ─────────────────────────────────────────────
// 1. AND (&) - Both bits must be 1
// ─────────────────────────────────────────────
// Truth Table:
// 0 & 0 = 0
// 0 & 1 = 0
// 1 & 0 = 0
// 1 & 1 = 1

console.log(5 & 3);  // 1
// 5 = 0101
// 3 = 0011
// & = 0001 = 1

// USE CASE: Check if a flag is set
const READ = 1;    // 001
const WRITE = 2;   // 010
const EXECUTE = 4; // 100

let permissions = 5;  // READ + EXECUTE = 101

if (permissions & READ) {
  console.log('Has read permission');  // ✓ Prints
}

if (permissions & WRITE) {
  console.log('Has write permission');  // ✗ Doesn't print
}

// ─────────────────────────────────────────────
// 2. OR (|) - At least one bit must be 1
// ─────────────────────────────────────────────
// Truth Table:
// 0 | 0 = 0
// 0 | 1 = 1
// 1 | 0 = 1
// 1 | 1 = 1

console.log(5 | 3);  // 7
// 5 = 0101
// 3 = 0011
// | = 0111 = 7

// USE CASE: Set a flag
permissions = permissions | WRITE;  // Add write permission
console.log(permissions);  // 7 (111 = READ + WRITE + EXECUTE)

// ─────────────────────────────────────────────
// 3. XOR (^) - Exactly one bit must be 1
// ─────────────────────────────────────────────
// Truth Table:
// 0 ^ 0 = 0
// 0 ^ 1 = 1
// 1 ^ 0 = 1
// 1 ^ 1 = 0

console.log(5 ^ 3);  // 6
// 5 = 0101
// 3 = 0011
// ^ = 0110 = 6

// USE CASE: Toggle a flag
permissions = permissions ^ WRITE;  // Remove write permission
console.log(permissions);  // 5 (101 = READ + EXECUTE)

// USE CASE: Swap two numbers without temp variable
let a = 5, b = 3;
a = a ^ b;  // a = 6
b = a ^ b;  // b = 5
a = a ^ b;  // a = 3
console.log(a, b);  // 3 5 (swapped!)

// ─────────────────────────────────────────────
// 4. NOT (~) - Flip all bits
// ─────────────────────────────────────────────
console.log(~5);  // -6
// 5 = 00000101
// ~ = 11111010 (in two's complement = -6)

// USE CASE: Invert all flags
const allFlags = 0b1111;
const inverted = ~allFlags & 0b1111;  // Mask to keep only 4 bits
console.log(inverted.toString(2));  // 0000

// ─────────────────────────────────────────────
// 5. LEFT SHIFT (<<) - Shift bits left
// ─────────────────────────────────────────────
console.log(5 << 1);  // 10
// 5 = 0101
// << 1 = 1010 = 10

// Equivalent to: 5 * 2 = 10
console.log(5 << 2);  // 20 (5 * 4)
console.log(5 << 3);  // 40 (5 * 8)

// USE CASE: Multiply by powers of 2
const multiplyBy8 = (n) => n << 3;
console.log(multiplyBy8(5));  // 40

// ─────────────────────────────────────────────
// 6. RIGHT SHIFT (>>) - Shift bits right (signed)
// ─────────────────────────────────────────────
console.log(10 >> 1);  // 5
// 10 = 1010
// >> 1 = 0101 = 5

// Equivalent to: 10 / 2 = 5 (integer division)
console.log(20 >> 2);  // 5 (20 / 4)

// USE CASE: Divide by powers of 2
const divideBy8 = (n) => n >> 3;
console.log(divideBy8(40));  // 5

// ─────────────────────────────────────────────
// 7. UNSIGNED RIGHT SHIFT (>>>) - Shift right (unsigned)
// ─────────────────────────────────────────────
console.log(-10 >> 1);   // -5 (keeps sign)
console.log(-10 >>> 1);  // 2147483643 (treats as unsigned)

// USE CASE: Convert to unsigned 32-bit integer
const unsigned = -1 >>> 0;
console.log(unsigned);  // 4294967295
```

---

## 🚀 **PRACTICAL NODE.JS APPLICATIONS**

### **1. Permission System**

```javascript
// ─────────────────────────────────────────────
// ROLE-BASED PERMISSION SYSTEM
// ─────────────────────────────────────────────
class PermissionFlags {
  static NONE = 0;
  static READ = 1;        // 0001
  static WRITE = 2;       // 0010
  static DELETE = 4;      // 0100
  static ADMIN = 8;       // 1000
}

class User {
  constructor(name, permissions = PermissionFlags.NONE) {
    this.name = name;
    this.permissions = permissions;
  }
  
  // Add permission
  addPermission(flag) {
    this.permissions |= flag;
    return this;
  }
  
  // Remove permission
  removePermission(flag) {
    this.permissions &= ~flag;
    return this;
  }
  
  // Check permission
  hasPermission(flag) {
    return (this.permissions & flag) === flag;
  }
  
  // Toggle permission
  togglePermission(flag) {
    this.permissions ^= flag;
    return this;
  }
  
  // Get all permissions as array
  getPermissions() {
    const result = [];
    if (this.hasPermission(PermissionFlags.READ)) result.push('READ');
    if (this.hasPermission(PermissionFlags.WRITE)) result.push('WRITE');
    if (this.hasPermission(PermissionFlags.DELETE)) result.push('DELETE');
    if (this.hasPermission(PermissionFlags.ADMIN)) result.push('ADMIN');
    return result;
  }
}

// Usage
const user = new User('John');

user
  .addPermission(PermissionFlags.READ)
  .addPermission(PermissionFlags.WRITE);

console.log(user.getPermissions());  // ['READ', 'WRITE']
console.log(user.hasPermission(PermissionFlags.READ));   // true
console.log(user.hasPermission(PermissionFlags.DELETE)); // false

user.togglePermission(PermissionFlags.DELETE);
console.log(user.getPermissions());  // ['READ', 'WRITE', 'DELETE']

user.removePermission(PermissionFlags.WRITE);
console.log(user.getPermissions());  // ['READ', 'DELETE']
```

### **2. Feature Toggles**

```javascript
// ─────────────────────────────────────────────
// FEATURE FLAG SYSTEM
// ─────────────────────────────────────────────
class FeatureFlags {
  static DARK_MODE = 1;      // 0001
  static BETA_FEATURES = 2;  // 0010
  static ANALYTICS = 4;      // 0100
  static NOTIFICATIONS = 8;  // 1000
}

class UserPreferences {
  constructor() {
    this.flags = 0;
  }
  
  enableFeature(flag) {
    this.flags |= flag;
  }
  
  disableFeature(flag) {
    this.flags &= ~flag;
  }
  
  isFeatureEnabled(flag) {
    return (this.flags & flag) !== 0;
  }
  
  // Get flags as object
  toJSON() {
    return {
      darkMode: this.isFeatureEnabled(FeatureFlags.DARK_MODE),
      betaFeatures: this.isFeatureEnabled(FeatureFlags.BETA_FEATURES),
      analytics: this.isFeatureEnabled(FeatureFlags.ANALYTICS),
      notifications: this.isFeatureEnabled(FeatureFlags.NOTIFICATIONS),
    };
  }
}

// Usage
const prefs = new UserPreferences();
prefs.enableFeature(FeatureFlags.DARK_MODE);
prefs.enableFeature(FeatureFlags.ANALYTICS);

console.log(prefs.toJSON());
// { darkMode: true, betaFeatures: false, analytics: true, notifications: false }
```

### **3. LRU Cache Implementation**

```javascript
// ─────────────────────────────────────────────
// LRU CACHE USING BIT OPTIMIZATION
// ─────────────────────────────────────────────
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
    this.usage = new Map();  // Track usage with timestamps
  }
  
  get(key) {
    if (!this.cache.has(key)) {
      return -1;
    }
    
    // Update usage timestamp
    this.usage.set(key, Date.now());
    
    return this.cache.get(key);
  }
  
  put(key, value) {
    if (this.cache.size >= this.capacity && !this.cache.has(key)) {
      // Find least recently used
      let oldestKey = null;
      let oldestTime = Infinity;
      
      for (const [k, time] of this.usage) {
        if (time < oldestTime) {
          oldestTime = time;
          oldestKey = k;
        }
      }
      
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.usage.delete(oldestKey);
      }
    }
    
    this.cache.set(key, value);
    this.usage.set(key, Date.now());
  }
}

// Usage
const cache = new LRUCache(2);
cache.put(1, 1);
cache.put(2, 2);
console.log(cache.get(1));    // 1
cache.put(3, 3);              // Evicts key 2
console.log(cache.get(2));    // -1 (not found)
```

---

## 🎯 **COMMON BIT MANIPULATION TRICKS**

```javascript
// ─────────────────────────────────────────────
// TRICK 1: Check if number is even/odd
// ─────────────────────────────────────────────
function isEven(n) {
  return (n & 1) === 0;
}

function isOdd(n) {
  return (n & 1) === 1;
}

console.log(isEven(4));  // true
console.log(isOdd(5));   // true

// ─────────────────────────────────────────────
// TRICK 2: Check if number is power of 2
// ─────────────────────────────────────────────
function isPowerOfTwo(n) {
  return n > 0 && (n & (n - 1)) === 0;
}

console.log(isPowerOfTwo(4));   // true (100)
console.log(isPowerOfTwo(8));   // true (1000)
console.log(isPowerOfTwo(5));   // false (101)
console.log(isPowerOfTwo(0));   // false

// ─────────────────────────────────────────────
// TRICK 3: Count set bits (1s) in number
// ─────────────────────────────────────────────
function countSetBits(n) {
  let count = 0;
  while (n > 0) {
    n &= (n - 1);  // Remove rightmost set bit
    count++;
  }
  return count;
}

console.log(countSetBits(5));   // 2 (101 has two 1s)
console.log(countSetBits(7));   // 3 (111 has three 1s)

// ─────────────────────────────────────────────
// TRICK 4: Get rightmost set bit
// ─────────────────────────────────────────────
function getRightmostSetBit(n) {
  return n & -n;
}

console.log(getRightmostSetBit(12));  // 4 (1100 & 0100 = 0100)

// ─────────────────────────────────────────────
// TRICK 5: Swap two numbers without temp
// ─────────────────────────────────────────────
function swap(a, b) {
  a = a ^ b;
  b = a ^ b;
  a = a ^ b;
  return [a, b];
}

console.log(swap(5, 3));  // [3, 5]

// ─────────────────────────────────────────────
// TRICK 6: Find single number in array
// ─────────────────────────────────────────────
// Every element appears twice except one
function findSingleNumber(nums) {
  let result = 0;
  for (const num of nums) {
    result ^= num;  // XOR cancels out pairs
  }
  return result;
}

console.log(findSingleNumber([4, 1, 2, 1, 2]));  // 4
// 4 ^ 1 ^ 2 ^ 1 ^ 2 = 4 ^ (1^1) ^ (2^2) = 4 ^ 0 ^ 0 = 4

// ─────────────────────────────────────────────
// TRICK 7: Check if bit at position is set
// ─────────────────────────────────────────────
function isBitSet(n, position) {
  return (n & (1 << position)) !== 0;
}

console.log(isBitSet(5, 0));  // true (5 = 101, bit 0 is 1)
console.log(isBitSet(5, 1));  // false (bit 1 is 0)
console.log(isBitSet(5, 2));  // true (bit 2 is 1)

// ─────────────────────────────────────────────
// TRICK 8: Set bit at position
// ─────────────────────────────────────────────
function setBit(n, position) {
  return n | (1 << position);
}

console.log(setBit(5, 1));  // 7 (101 | 010 = 111)

// ─────────────────────────────────────────────
// TRICK 9: Clear bit at position
// ─────────────────────────────────────────────
function clearBit(n, position) {
  return n & ~(1 << position);
}

console.log(clearBit(5, 0));  // 4 (101 & ~001 = 100)

// ─────────────────────────────────────────────
// TRICK 10: Update bit at position
// ─────────────────────────────────────────────
function updateBit(n, position, value) {
  const mask = ~(1 << position);
  return (n & mask) | (value << position);
}

console.log(updateBit(5, 0, 0));  // 4 (101 → 100)
console.log(updateBit(5, 1, 1));  // 7 (101 → 111)
```

---

## 📊 **INTERVIEW PROBLEMS**

```javascript
// ─────────────────────────────────────────────
// PROBLEM 1: SINGLE NUMBER (LeetCode 136)
// ─────────────────────────────────────────────
function singleNumber(nums) {
  let result = 0;
  for (const num of nums) {
    result ^= num;
  }
  return result;
}

// ─────────────────────────────────────────────
// PROBLEM 2: NUMBER OF 1 BITS (LeetCode 191)
// ─────────────────────────────────────────────
function hammingWeight(n) {
  let count = 0;
  while (n !== 0) {
    n &= (n - 1);
    count++;
  }
  return count;
}

// ─────────────────────────────────────────────
// PROBLEM 3: REVERSE BITS (LeetCode 190)
// ─────────────────────────────────────────────
function reverseBits(n) {
  let result = 0;
  
  for (let i = 0; i < 32; i++) {
    result <<= 1;           // Shift result left
    result |= (n & 1);      // Add rightmost bit of n
    n >>>= 1;               // Shift n right (unsigned)
  }
  
  return result >>> 0;  // Convert to unsigned
}

// ─────────────────────────────────────────────
// PROBLEM 4: MISSING NUMBER (LeetCode 268)
// ─────────────────────────────────────────────
function missingNumber(nums) {
  let result = nums.length;
  
  for (let i = 0; i < nums.length; i++) {
    result ^= i ^ nums[i];
  }
  
  return result;
}

// Example: [3, 0, 1]
// result = 3
// result = 3 ^ 0 ^ 3 = 0
// result = 0 ^ 1 ^ 0 = 1
// result = 1 ^ 2 ^ 1 = 2
// Missing number: 2

// ─────────────────────────────────────────────
// PROBLEM 5: SUM OF TWO INTEGERS (LeetCode 371)
// ─────────────────────────────────────────────
// Add without using + or -
function getSum(a, b) {
  while (b !== 0) {
    const carry = (a & b) << 1;  // Calculate carry
    a = a ^ b;                    // Sum without carry
    b = carry;                    // Add carry in next iteration
  }
  return a;
}

console.log(getSum(5, 3));  // 8
```

---

## ✅ **CHECKLIST**

```
Bit Manipulation Mastery:
[ ] Understand all 7 bitwise operators
[ ] Know permission/flag use cases
[ ] Master common tricks (isEven, isPowerOfTwo, etc.)
[ ] Can solve single number problems
[ ] Understand XOR properties
[ ] Can implement LRU cache
[ ] Know when to use bit manipulation for optimization
```

---

**Next**: Advanced Graph Algorithms (Dijkstra, Bellman-Ford, Floyd-Warshall, Prim's, Kruskal's)

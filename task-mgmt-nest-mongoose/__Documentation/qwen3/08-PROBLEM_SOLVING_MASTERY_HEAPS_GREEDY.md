# 📘 **PROBLEM SOLVING MASTERY - Lesson 8: Heaps & Greedy Algorithms**

**Date**: 23-03-26
**Level**: 🟢 Beginner → 🔴 FAANG Ready
**Series**: DSA & Interview Preparation
**Time**: 90 minutes
**Prerequisites**: Lesson 1-7 (Fundamentals through Trees & Graphs)
- [LastRead](#lastRead)
---

## 🎯 **LEARNING OBJECTIVES**

After completing this **comprehensive** lesson, you will:

1. ✅ **Master Heap Fundamentals** - Min heap, max heap, heap properties
2. ✅ **Master Heap Operations** - Insert, extract, heapify, heap operations
3. ✅ **Recognize Heap Patterns** - Top K, median, merge k sorted, scheduling
4. ✅ **Master Greedy Thinking** - When greedy works, proof techniques
5. ✅ **Solve Greedy Problems** - Intervals, tasks, Huffman coding
6. ✅ **Solve FAANG Problems** - Real interview questions with detailed solutions

---

## 📦 **PART 1: HEAP FUNDAMENTALS**

### **Heap Structure & Properties**

```mermaid
graph TB
    subgraph "Min Heap (Complete Binary Tree)"
        A[1]
        B[3]
        C[2]
        D[7]
        E[6]
        F[4]
        G[5]
        
        A --> B
        A --> C
        B --> D
        B --> E
        C --> F
        C --> G
        
        style A fill:#ff6b6b
        style B fill:#ffe66d
        style C fill:#ffe66d
        style D fill:#4ecdc4
        style E fill:#4ecdc4
        style F fill:#4ecdc4
        style G fill:#4ecdc4
    end

    subgraph "Array Representation"
        H[Index: 0 1 2 3 4 5 6]
        I[Value: 1 3 2 7 6 4 5]
        
        style H fill:#95e1d3
        style I fill:#95e1d3
    end

    note: "Parent: (i-1)/2\nLeft: 2i+1\nRight: 2i+2"
```

---

### **Heap Properties**

```javascript
// ─────────────────────────────────────────────
// HEAP PROPERTIES
// ─────────────────────────────────────────────
// 1. Shape Property: Complete binary tree
//    - All levels filled except possibly last
//    - Last level filled left to right

// 2. Heap Property:
//    - Min Heap: parent <= children
//    - Max Heap: parent >= children

// 3. Array Representation:
//    - Parent of i: Math.floor((i-1)/2)
//    - Left child of i: 2*i + 1
//    - Right child of i: 2*i + 2

// 4. Height: O(log n)
// 5. Operations:
//    - Insert: O(log n)
//    - Extract Min/Max: O(log n)
//    - Peek: O(1)
//    - Search: O(n)
```

---

### **Heap Implementation**

```javascript
// ─────────────────────────────────────────────
// MIN HEAP IMPLEMENTATION
// ─────────────────────────────────────────────
class MinHeap {
  constructor() {
    this.heap = [];
  }
  
  // Get indices
  parent(i) { return Math.floor((i - 1) / 2); }
  left(i) { return 2 * i + 1; }
  right(i) { return 2 * i + 2; }
  
  // Swap elements
  swap(i, j) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }
  
  // Insert element - O(log n)
  insert(val) {
    this.heap.push(val);
    this.bubbleUp(this.heap.length - 1);
  }
  
  // Bubble up to maintain heap property
  bubbleUp(i) {
    while (i > 0 && this.heap[this.parent(i)] > this.heap[i]) {
      this.swap(i, this.parent(i));
      i = this.parent(i);
    }
  }
  
  // Extract minimum - O(log n)
  extractMin() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();
    
    const min = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.bubbleDown(0);
    
    return min;
  }
  
  // Bubble down to maintain heap property
  bubbleDown(i) {
    let smallest = i;
    const left = this.left(i);
    const right = this.right(i);
    
    if (left < this.heap.length && this.heap[left] < this.heap[smallest]) {
      smallest = left;
    }
    
    if (right < this.heap.length && this.heap[right] < this.heap[smallest]) {
      smallest = right;
    }
    
    if (smallest !== i) {
      this.swap(i, smallest);
      this.bubbleDown(smallest);
    }
  }
  
  // Peek minimum - O(1)
  peek() {
    return this.heap.length === 0 ? null : this.heap[0];
  }
  
  // Get size
  size() {
    return this.heap.length;
  }
  
  // Check if empty
  isEmpty() {
    return this.heap.length === 0;
  }
}

// ─────────────────────────────────────────────
// MAX HEAP (Minor modifications)
// ─────────────────────────────────────────────
class MaxHeap extends MinHeap {
  // Override bubbleUp for max heap
  bubbleUp(i) {
    while (i > 0 && this.heap[this.parent(i)] < this.heap[i]) {
      this.swap(i, this.parent(i));
      i = this.parent(i);
    }
  }
  
  // Override bubbleDown for max heap
  bubbleDown(i) {
    let largest = i;
    const left = this.left(i);
    const right = this.right(i);
    
    if (left < this.heap.length && this.heap[left] > this.heap[largest]) {
      largest = left;
    }
    
    if (right < this.heap.length && this.heap[right] > this.heap[largest]) {
      largest = right;
    }
    
    if (largest !== i) {
      this.swap(i, largest);
      this.bubbleDown(largest);
    }
  }
  
  // Extract maximum instead of minimum
  extractMax() {
    return this.extractMin();  // Same logic, just reversed comparison
  }
  
  peekMax() {
    return this.peek();
  }
}

// ─────────────────────────────────────────────
// JAVASCRIPT'S BUILT-IN APPROACH (Using Array)
// ─────────────────────────────────────────────
// JavaScript doesn't have built-in heap, but we can use:
// 1. Custom implementation (above)
// 2. Sorted array (inefficient for insert)
// 3. Third-party libraries (e.g., 'heap' npm package)

// Using sorted array (for reference)
class SortedHeap {
  constructor(isMin = true) {
    this.heap = [];
    this.isMin = isMin;
  }
  
  insert(val) {
    this.heap.push(val);
    this.heap.sort((a, b) => this.isMin ? a - b : b - a);
  }
  
  extract() {
    return this.heap.shift();
  }
  
  peek() {
    return this.heap[0];
  }
}
// Note: insert is O(n log n), not recommended!
```

---

## 📦 **PART 2: HEAP PATTERNS**

### **Top K Elements Pattern**

```javascript
// ─────────────────────────────────────────────
// TOP K LARGEST ELEMENTS
// ─────────────────────────────────────────────
// Use Min Heap of size k
function topKLargest(nums, k) {
  const minHeap = new MinHeap();
  
  for (const num of nums) {
    if (minHeap.size() < k) {
      minHeap.insert(num);
    } else if (num > minHeap.peek()) {
      minHeap.extractMin();
      minHeap.insert(num);
    }
  }
  
  // Extract all elements (they'll be in ascending order)
  const result = [];
  while (!minHeap.isEmpty()) {
    result.push(minHeap.extractMin());
  }
  
  return result.reverse();  // Return in descending order
}

// Time: O(n log k), Space: O(k)

// ─────────────────────────────────────────────
// TOP K FREQUENT ELEMENTS - LeetCode 347
// ─────────────────────────────────────────────
function topKFrequent(nums, k) {
  // Step 1: Count frequencies
  const freq = new Map();
  for (const num of nums) {
    freq.set(num, (freq.get(num) || 0) + 1);
  }
  
  // Step 2: Min heap of size k
  const minHeap = new MinHeap();
  
  for (const [num, count] of freq) {
    if (minHeap.size() < k) {
      minHeap.insert([count, num]);
    } else if (count > minHeap.peek()[0]) {
      minHeap.extractMin();
      minHeap.insert([count, num]);
    }
  }
  
  // Step 3: Extract results
  return minHeap.heap.map(([_, num]) => num);
}

// Time: O(n log k), Space: O(n + k)

// ─────────────────────────────────────────────
// KTH LARGEST ELEMENT - LeetCode 215
// ─────────────────────────────────────────────
function findKthLargest(nums, k) {
  const minHeap = new MinHeap();
  
  for (const num of nums) {
    if (minHeap.size() < k) {
      minHeap.insert(num);
    } else if (num > minHeap.peek()) {
      minHeap.extractMin();
      minHeap.insert(num);
    }
  }
  
  return minHeap.peek();
}

// Alternative: Quick Select - O(n) average
function findKthLargestQuickSelect(nums, k) {
  let left = 0;
  let right = nums.length - 1;
  const targetIndex = nums.length - k;
  
  while (left <= right) {
    const pivotIndex = partition(nums, left, right);
    
    if (pivotIndex === targetIndex) {
      return nums[pivotIndex];
    } else if (pivotIndex < targetIndex) {
      left = pivotIndex + 1;
    } else {
      right = pivotIndex - 1;
    }
  }
  
  return -1;
}

function partition(nums, left, right) {
  const pivot = nums[right];
  let i = left;
  
  for (let j = left; j < right; j++) {
    if (nums[j] <= pivot) {
      [nums[i], nums[j]] = [nums[j], nums[i]];
      i++;
    }
  }
  
  [nums[i], nums[right]] = [nums[right], nums[i]];
  return i;
}
```

---

### **Merge K Sorted Lists**

```javascript
// ─────────────────────────────────────────────
// MERGE K SORTED LISTS - LeetCode 23
// ─────────────────────────────────────────────
function mergeKLists(lists) {
  if (lists.length === 0) return null;
  
  // Min heap to store [value, listIndex, node]
  const minHeap = new MinHeap();
  
  // Add head of each list
  for (let i = 0; i < lists.length; i++) {
    if (lists[i]) {
      minHeap.insert([lists[i].val, i, lists[i]]);
    }
  }
  
  const dummy = new ListNode(0);
  let current = dummy;
  
  while (!minHeap.isEmpty()) {
    const [val, listIdx, node] = minHeap.extractMin();
    
    current.next = node;
    current = current.next;
    
    // Add next node from same list
    if (node.next) {
      minHeap.insert([node.next.val, listIdx, node.next]);
    }
  }
  
  return dummy.next;
}

// Time: O(n log k) where n = total nodes, k = number of lists
// Space: O(k) for heap
```

---

### **Find Median**

```javascript
// ─────────────────────────────────────────────
// FIND MEDIAN FROM DATA STREAM - LeetCode 295
// ─────────────────────────────────────────────
class MedianFinder {
  constructor() {
    this.maxHeap = new MaxHeap();  // Left half (smaller numbers)
    this.minHeap = new MinHeap();  // Right half (larger numbers)
  }
  
  addNum(num) {
    // Add to max heap first
    this.maxHeap.insert(num);
    
    // Balance: largest of left should be <= smallest of right
    if (!this.minHeap.isEmpty() && this.maxHeap.peek() > this.minHeap.peek()) {
      this.minHeap.insert(this.maxHeap.extractMin());
    }
    
    // Rebalance sizes (max heap can have at most 1 more element)
    if (this.maxHeap.size() > this.minHeap.size() + 1) {
      this.minHeap.insert(this.maxHeap.extractMin());
    } else if (this.minHeap.size() > this.maxHeap.size()) {
      this.maxHeap.insert(this.minHeap.extractMin());
    }
  }
  
  findMedian() {
    if (this.maxHeap.size() === this.minHeap.size()) {
      return (this.maxHeap.peek() + this.minHeap.peek()) / 2;
    }
    return this.maxHeap.peek();  // Max heap has one more element
  }
}

// Time: addNum O(log n), findMedian O(1)
// Space: O(n)
```

---

## 📦 **PART 3: GREEDY ALGORITHMS**

### **When Greedy Works**

```mermaid
graph TB
    subgraph "Greedy Choice Property"
        A[Make locally optimal choice]
        B[Hope for globally optimal solution]
        A --> B
    end

    subgraph "Optimal Substructure"
        C[Optimal solution contains\noptimal solutions to subproblems]
    end

    subgraph "Greedy Works For"
        D[Activity Selection]
        E[Huffman Coding]
        F[Minimum Spanning Tree]
        G[Interval Scheduling]
    end

    subgraph "Greedy Doesn't Work For"
        H[0/1 Knapsack]
        I[Coin Change (general)]
        J[Traveling Salesman]
    end

    style A fill:#4ecdc4
    style B fill:#95e1d3
    style D fill:#4ecdc4
    style E fill:#4ecdc4
    style F fill:#4ecdc4
    style G fill:#4ecdc4
    style H fill:#ff6b6b
    style I fill:#ff6b6b
    style J fill:#ff6b6b
```

---

### **Interval Problems**

```javascript
// ─────────────────────────────────────────────
// MERGE INTERVALS - LeetCode 56
// ─────────────────────────────────────────────
function mergeIntervals(intervals) {
  if (intervals.length <= 1) return intervals;
  
  // Sort by start time
  intervals.sort((a, b) => a[0] - b[0]);
  
  const result = [intervals[0]];
  
  for (let i = 1; i < intervals.length; i++) {
    const last = result[result.length - 1];
    const current = intervals[i];
    
    // Overlapping: merge
    if (current[0] <= last[1]) {
      last[1] = Math.max(last[1], current[1]);
    } else {
      // Non-overlapping: add new interval
      result.push(current);
    }
  }
  
  return result;
}

// Time: O(n log n), Space: O(1) excluding output

// Greedy choice: Always merge if overlapping
// Why it works: Sorting ensures we process in order

// ─────────────────────────────────────────────
// INSERT INTERVAL - LeetCode 57
// ─────────────────────────────────────────────
function insertInterval(intervals, newInterval) {
  const result = [];
  let i = 0;
  
  // Add intervals before newInterval
  while (i < intervals.length && intervals[i][1] < newInterval[0]) {
    result.push(intervals[i]);
    i++;
  }
  
  // Merge overlapping intervals
  while (i < intervals.length && intervals[i][0] <= newInterval[1]) {
    newInterval[0] = Math.min(newInterval[0], intervals[i][0]);
    newInterval[1] = Math.max(newInterval[1], intervals[i][1]);
    i++;
  }
  result.push(newInterval);
  
  // Add remaining intervals
  while (i < intervals.length) {
    result.push(intervals[i]);
    i++;
  }
  
  return result;
}

// ─────────────────────────────────────────────
// NON-OVERLAPPING INTERVALS - LeetCode 435
// ─────────────────────────────────────────────
function eraseOverlapIntervals(intervals) {
  if (intervals.length <= 1) return 0;
  
  // Sort by end time (greedy: pick earliest ending)
  intervals.sort((a, b) => a[1] - b[1]);
  
  let count = 0;
  let prevEnd = intervals[0][1];
  
  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i][0] < prevEnd) {
      // Overlapping: remove this interval
      count++;
    } else {
      // Non-overlapping: update prevEnd
      prevEnd = intervals[i][1];
    }
  }
  
  return count;
}

// Greedy choice: Always pick interval that ends earliest
// Why it works: Leaves maximum room for remaining intervals

// ─────────────────────────────────────────────
// MEETING ROOMS II - LeetCode 253
// ─────────────────────────────────────────────
function minMeetingRooms(intervals) {
  if (intervals.length === 0) return 0;
  
  // Separate start and end times
  const starts = intervals.map(i => i[0]).sort((a, b) => a - b);
  const ends = intervals.map(i => i[1]).sort((a, b) => a - b);
  
  let rooms = 0;
  let endPtr = 0;
  
  for (let i = 0; i < starts.length; i++) {
    if (starts[i] < ends[endPtr]) {
      // Need a new room
      rooms++;
    } else {
      // A room freed up
      endPtr++;
    }
  }
  
  return rooms;
}

// Alternative: Min heap approach
function minMeetingRoomsHeap(intervals) {
  if (intervals.length === 0) return 0;
  
  intervals.sort((a, b) => a[0] - b[0]);
  
  const minHeap = new MinHeap();
  minHeap.insert(intervals[0][1]);
  
  for (let i = 1; i < intervals.length; i++) {
    // If earliest ending meeting ends before current starts
    if (intervals[i][0] >= minHeap.peek()) {
      minHeap.extractMin();
    }
    minHeap.insert(intervals[i][1]);
  }
  
  return minHeap.size();
}
```

---

### **Task Scheduling**

```javascript
// ─────────────────────────────────────────────
// TASK SCHEDULER - LeetCode 621
// ─────────────────────────────────────────────
function leastInterval(tasks, n) {
  // Count frequencies
  const freq = new Map();
  for (const task of tasks) {
    freq.set(task, (freq.get(task) || 0) + 1);
  }
  
  // Get max frequency
  const maxFreq = Math.max(...freq.values());
  
  // Count tasks with max frequency
  const maxCount = [...freq.values()].filter(f => f === maxFreq).length;
  
  // Calculate minimum intervals needed
  // Either: (maxFreq - 1) * (n + 1) + maxCount
  // Or: total tasks (if no idle time needed)
  return Math.max(
    (maxFreq - 1) * (n + 1) + maxCount,
    tasks.length
  );
}

// Greedy: Always process most frequent task first
// Time: O(n), Space: O(26) = O(1)

// ─────────────────────────────────────────────
// MAXIMUM UNITS ON TRUCK - LeetCode 1710
// ─────────────────────────────────────────────
function maximumUnits(boxTypes, truckSize) {
  // Sort by units per box (descending)
  boxTypes.sort((a, b) => b[1] - a[1]);
  
  let totalUnits = 0;
  
  for (const [numBoxes, unitsPerBox] of boxTypes) {
    if (truckSize === 0) break;
    
    const boxesToTake = Math.min(truckSize, numBoxes);
    totalUnits += boxesToTake * unitsPerBox;
    truckSize -= boxesToTake;
  }
  
  return totalUnits;
}

// Greedy: Always take boxes with most units first
// Time: O(n log n), Space: O(1)
```

---

### **Huffman Coding**

```javascript
// ─────────────────────────────────────────────
// HUFFMAN CODING (Conceptual)
// ─────────────────────────────────────────────
class HuffmanNode {
  constructor(char = null, freq = 0, left = null, right = null) {
    this.char = char;
    this.freq = freq;
    this.left = left;
    this.right = right;
  }
}

function buildHuffmanTree(freqMap) {
  // Create min heap of nodes
  const minHeap = new MinHeap();
  
  for (const [char, freq] of freqMap) {
    minHeap.insert([freq, new HuffmanNode(char, freq)]);
  }
  
  // Build tree
  while (minHeap.size() > 1) {
    const [freq1, node1] = minHeap.extractMin();
    const [freq2, node2] = minHeap.extractMin();
    
    const merged = new HuffmanNode(null, freq1 + freq2, node1, node2);
    minHeap.insert([merged.freq, merged]);
  }
  
  return minHeap.extractMin()[1];
}

function generateCodes(root, code = '', codes = {}) {
  if (!root) return;
  
  if (root.char) {
    codes[root.char] = code;
    return;
  }
  
  generateCodes(root.left, code + '0', codes);
  generateCodes(root.right, code + '1', codes);
  
  return codes;
}

// Greedy: Always merge two least frequent nodes
// Time: O(n log n), Space: O(n)
```

---

## 📦 **PART 4: ADVANCED HEAP PROBLEMS**

### **K Closest Points**

```javascript
// ─────────────────────────────────────────────
// K CLOSEST POINTS TO ORIGIN - LeetCode 973
// ─────────────────────────────────────────────
function kClosest(points, k) {
  // Max heap to keep k closest
  const maxHeap = new MaxHeap();
  
  const distance = (point) => point[0] ** 2 + point[1] ** 2;
  
  for (const point of points) {
    const dist = distance(point);
    
    if (maxHeap.size() < k) {
      maxHeap.insert([dist, point]);
    } else if (dist < maxHeap.peek()[0]) {
      maxHeap.extractMax();
      maxHeap.insert([dist, point]);
    }
  }
  
  return maxHeap.heap.map(([_, point]) => point);
}

// Time: O(n log k), Space: O(k)
```

---

### **Reorganize String**

```javascript
// ─────────────────────────────────────────────
// REORGANIZE STRING - LeetCode 767
// ─────────────────────────────────────────────
function reorganizeString(s) {
  // Count frequencies
  const freq = new Map();
  for (const char of s) {
    freq.set(char, (freq.get(char) || 0) + 1);
  }
  
  // Check if reorganization is possible
  const maxFreq = Math.max(...freq.values());
  if (maxFreq > Math.ceil(s.length / 2)) {
    return '';
  }
  
  // Max heap by frequency
  const maxHeap = new MaxHeap();
  for (const [char, count] of freq) {
    maxHeap.insert([count, char]);
  }
  
  const result = [];
  
  while (maxHeap.size() >= 2) {
    const [count1, char1] = maxHeap.extractMax();
    const [count2, char2] = maxHeap.extractMax();
    
    result.push(char1, char2);
    
    if (count1 > 1) maxHeap.insert([count1 - 1, char1]);
    if (count2 > 1) maxHeap.insert([count2 - 1, char2]);
  }
  
  if (maxHeap.size() === 1) {
    result.push(maxHeap.extractMax()[1]);
  }
  
  return result.join('');
}

// Greedy: Always pick two most frequent different characters
// Time: O(n log k), Space: O(k)
```

---

### **IPO Problem**

```javascript
// ─────────────────────────────────────────────
// IPO - LeetCode 502
// ─────────────────────────────────────────────
function findMaximizedCapital(k, w, profits, capital) {
  const n = profits.length;
  
  // Combine and sort by capital
  const projects = [];
  for (let i = 0; i < n; i++) {
    projects.push([capital[i], profits[i]]);
  }
  projects.sort((a, b) => a[0] - b[0]);
  
  // Max heap for profits
  const maxHeap = new MaxHeap();
  let i = 0;
  
  for (let j = 0; j < k; j++) {
    // Add all affordable projects to heap
    while (i < n && projects[i][0] <= w) {
      maxHeap.insert(projects[i][1]);
      i++;
    }
    
    if (maxHeap.isEmpty()) break;
    
    // Pick most profitable project
    w += maxHeap.extractMax();
  }
  
  return w;
}

// Greedy: Always pick most profitable affordable project
// Time: O(n log n + k log n), Space: O(n)
```

---

## ✅ **HEAPS & GREEDY CHECKLIST**

```
Heap Fundamentals
[ ] Min heap implementation
[ ] Max heap implementation
[ ] Heap operations (insert, extract, peek)
[ ] Array representation

Heap Patterns
[ ] Top K elements
[ ] Kth largest/smallest
[ ] Merge k sorted lists
[ ] Find median from stream
[ ] K closest points

Greedy Algorithms
[ ] Interval scheduling
[ ] Merge intervals
[ ] Meeting rooms
[ ] Task scheduling
[ ] Activity selection

Advanced Problems
[ ] Reorganize string
[ ] IPO problem
[ ] Huffman coding
[ ] Network delay time
```

---

## 🎯 **KNOWLEDGE CHECK**

### **Question 1: Heap Choice**

When finding Top K largest elements, why use Min Heap instead of Max Heap?

<details>
<summary>💡 Click to reveal answer</summary>

**Answer**: We want to keep track of the K largest elements seen so far.

**Min Heap approach**:
- Keep min heap of size K
- When new element > heap min, replace min with new element
- At the end, heap contains K largest elements
- Time: O(n log k)

**Why not Max Heap**:
- Max heap would require storing ALL elements
- Then extracting K times
- Time: O(n + k log n) which is worse when k << n

**Key insight**: Min heap's root is the "weakest" of the K largest, making it easy to replace.
</details>

---

### **Question 2: Greedy Proof**

Why does sorting by end time work for interval scheduling?

<details>
<summary>💡 Click to reveal answer</summary>

**Greedy Choice Property**: Picking the interval that ends earliest leaves maximum room for remaining intervals.

**Proof by contradiction**:
1. Assume optimal solution O doesn't include earliest-ending interval E
2. Let F be the first interval in O
3. Since E ends before or at same time as F, we can replace F with E
4. This doesn't reduce the number of intervals we can fit
5. Therefore, there exists an optimal solution that includes E

**Conclusion**: Greedy choice (earliest end time) is always part of some optimal solution.
</details>

---

## 📚 **PRACTICE PROBLEMS**

### **Easy**
- Kth Largest Element in an Array (LeetCode 215)
- Last Stone Weight (LeetCode 1046)
- K Closest Points to Origin (LeetCode 973)

### **Medium**
- Top K Frequent Elements (LeetCode 347)
- Merge K Sorted Lists (LeetCode 23)
- Find Median from Data Stream (LeetCode 295)
- Merge Intervals (LeetCode 56)
- Meeting Rooms II (LeetCode 253)
- Task Scheduler (LeetCode 621)

### **Hard**
- Median of Two Sorted Arrays (LeetCode 4)
- IPO (LeetCode 502)
- Reorganize String (LeetCode 767)
- Network Delay Time (LeetCode 743)

---

## 🎓 **HOMEWORK**

1. ✅ Implement Min Heap and Max Heap from scratch
2. ✅ Solve 10 Top K pattern problems
3. ✅ Solve 5 interval scheduling problems
4. ✅ Prove why greedy works for 3 different problems
5. ✅ Time yourself: 3 medium problems in 45 minutes

---

**Next Lesson**: Dynamic Programming - Memoization, Tabulation, Patterns
**Date**: 23-03-26
**Status**: ✅ Complete

---
-23-03-26

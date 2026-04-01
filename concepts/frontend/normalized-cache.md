# Normalized Cache

**What**: A cache structure that stores entities by ID in a flat lookup table, with separate indexes mapping queries to entity IDs.

**When to use**: Apps with complex, interconnected data where the same entity appears in multiple views or query results (social feeds, dashboards, data tables).

**Tradeoffs**: Eliminates data duplication and enables automatic UI updates, but adds complexity and normalization/denormalization overhead.

## How It Works

**Problem with naive caching:**
```javascript
// Cache by query string
cache = {
  '/users/1': { id: 1, name: 'Alice', posts: 5 },
  '/posts?userId=1': [{ id: 10, author: { id: 1, name: 'Alice', posts: 5 }}],
  '/feed': [{ id: 10, author: { id: 1, name: 'Alice', posts: 5 }}]
};

// If Alice creates a new post, must invalidate ALL queries containing Alice
// Data duplication: Alice's data stored 3 times
```

**Normalized structure:**
```javascript
// Entity store (single source of truth)
entities = {
  users: {
    1: { id: 1, name: 'Alice', posts: 6 } // Updated once
  },
  posts: {
    10: { id: 10, authorId: 1, title: 'Hello' }
  }
};

// Query index (maps queries to entity IDs)
queries = {
  '/users/1': { type: 'users', id: 1 },
  '/posts?userId=1': { type: 'posts', ids: [10] },
  '/feed': { type: 'posts', ids: [10] }
};
```

**Normalization process:**
```javascript
// Input: nested API response
const response = {
  id: 10,
  title: 'Hello',
  author: { id: 1, name: 'Alice', posts: 5 },
  comments: [
    { id: 20, text: 'Nice!', user: { id: 2, name: 'Bob' }}
  ]
};

// Output: normalized entities
{
  posts: { 10: { id: 10, title: 'Hello', authorId: 1, commentIds: [20] }},
  users: { 1: { id: 1, name: 'Alice', posts: 5 }, 2: { id: 2, name: 'Bob' }},
  comments: { 20: { id: 20, text: 'Nice!', userId: 2 }}
}
```

**Denormalization (for display):**
```javascript
function getPost(id) {
  const post = entities.posts[id];
  return {
    ...post,
    author: entities.users[post.authorId],
    comments: post.commentIds.map(cid => ({
      ...entities.comments[cid],
      user: entities.users[entities.comments[cid].userId]
    }))
  };
}
```

**Diagram:**
```
┌─────────────────┐
│ API Response    │
│ (nested data)   │
└────────┬────────┘
         │ normalize
         ▼
┌─────────────────┐     ┌──────────────┐
│ Entity Store    │◄────┤ Query Index  │
│ {               │     │ {            │
│   users: {...}, │     │   query1: [] │
│   posts: {...}  │     │   query2: [] │
│ }               │     │ }            │
└────────┬────────┘     └──────────────┘
         │ denormalize
         ▼
┌─────────────────┐
│ Component Props │
│ (nested data)   │
└─────────────────┘
```

## Complexity / Performance

**Normalization:**
- Time: O(n) where n = total entities in response
- Space: O(n) (no duplication vs O(n × m) for m queries)

**Denormalization:**
- Time: O(d) where d = depth of nesting
- Cache lookup: O(1) per entity

**Updates:**
- Single entity update: O(1) write, all views auto-update
- Cache invalidation: Target specific entity types, not entire queries

**Tradeoff:** Upfront normalization cost vs savings from:
- Reduced memory (no duplicate data)
- Simpler invalidation logic
- Automatic consistency across UI

## Real-World Examples

**Libraries:**
- **normalizr**: Schema-based normalization utility
- **Redux**: Often paired with normalizr for entity management
- **Apollo Client**: Built-in normalized cache with `__typename` + `id`
- **TanStack Query**: Optional normalization via custom cache structure
- **RTK Query**: Normalized cache with entity adapters

**Production usage:**
- **Twitter**: Normalized cache for tweets, users, threads
- **Facebook**: Entity store for posts, profiles, comments
- **Linear**: Normalized issues, projects, users
- **GitHub**: Repos, issues, PRs stored by ID

**Example (Apollo Client):**
```javascript
// Automatically normalized if objects have __typename and id
const QUERY = gql`
  query {
    post(id: 10) {
      id
      title
      author { id name }  # Stored separately as User:1
    }
  }
`;

// Update author once, all queries with User:1 reflect change
client.writeFragment({
  id: 'User:1',
  fragment: gql`fragment UserName on User { name }`,
  data: { name: 'Alice Updated' }
});
```

## Related Concepts

- `./state-management.md` — Normalized stores in Redux, Zustand
- `./race-conditions.md` — Cache helps manage out-of-order responses
- `../backend/database-indexing.md` — Similar to database normalization
- `../backend/caching.md` — Cache invalidation strategies

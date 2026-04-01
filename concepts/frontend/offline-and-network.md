# Offline and Network

**What**: Strategies for building resilient web apps that handle poor connectivity, offline mode, and network state changes.

**When to use**: Progressive Web Apps (PWAs), mobile web apps, apps used in areas with unreliable connectivity, or when optimistic UI is important.

**Tradeoffs**: Offline support adds complexity (caching, sync, conflict resolution) but dramatically improves perceived performance and user experience during network issues.

## How It Works

**Detecting network status:**
```javascript
// Browser API (unreliable: reports OS network state, not actual connectivity)
console.log(navigator.onLine); // true or false

// Listen for changes
window.addEventListener('online', () => {
  console.log('Back online');
  syncPendingChanges();
});

window.addEventListener('offline', () => {
  console.log('Lost connection');
  showOfflineNotice();
});

// Better: test actual connectivity
async function checkConnectivity() {
  try {
    const response = await fetch('/api/ping', {
      method: 'HEAD',
      cache: 'no-store'
    });
    return response.ok;
  } catch {
    return false;
  }
}
```

**Service Worker caching strategies:**
```javascript
// 1. Cache-first (fast, potentially stale)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});

// 2. Network-first (fresh, slower)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});

// 3. Stale-while-revalidate (fast + fresh)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open('my-cache').then((cache) => {
      return cache.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          cache.put(event.request, response.clone());
          return response;
        });
        return cached || fetchPromise;
      });
    })
  );
});

// 4. Cache-first with timeout (fallback if network slow)
const TIMEOUT = 3000;

self.addEventListener('fetch', (event) => {
  event.respondWith(
    Promise.race([
      caches.match(event.request),
      new Promise((resolve) => {
        setTimeout(() => resolve(null), TIMEOUT);
      })
    ]).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
```

**Optimistic UI updates:**
```jsx
// Show update immediately, rollback on error
function TodoList() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateTodo,
    onMutate: async (newTodo) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries(['todos']);

      // Snapshot previous value
      const previous = queryClient.getQueryData(['todos']);

      // Optimistically update UI
      queryClient.setQueryData(['todos'], (old) => {
        return old.map(todo =>
          todo.id === newTodo.id ? newTodo : todo
        );
      });

      return { previous };
    },
    onError: (err, newTodo, context) => {
      // Rollback on error
      queryClient.setQueryData(['todos'], context.previous);
      toast.error('Failed to update');
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries(['todos']);
    }
  });

  return (
    <div>
      {todos.map(todo => (
        <Todo
          key={todo.id}
          {...todo}
          onToggle={() => mutation.mutate({ ...todo, done: !todo.done })}
        />
      ))}
    </div>
  );
}
```

**Background sync (retry failed requests when back online):**
```javascript
// Service worker
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-todos') {
    event.waitUntil(syncPendingTodos());
  }
});

async function syncPendingTodos() {
  const db = await openDB('pending-changes');
  const changes = await db.getAll('todos');

  for (const change of changes) {
    try {
      await fetch('/api/todos', {
        method: 'POST',
        body: JSON.stringify(change)
      });
      await db.delete('todos', change.id);
    } catch (err) {
      console.error('Sync failed:', err);
    }
  }
}

// Register sync when offline action taken
if ('serviceWorker' in navigator && 'sync' in registration) {
  await registration.sync.register('sync-todos');
}
```

**IndexedDB for offline storage:**
```javascript
// Store data client-side for offline access
import { openDB } from 'idb';

const db = await openDB('my-app', 1, {
  upgrade(db) {
    db.createObjectStore('todos', { keyPath: 'id' });
    db.createObjectStore('pending-changes', { autoIncrement: true });
  }
});

// Write
await db.put('todos', { id: 1, title: 'Buy milk', done: false });

// Read
const todos = await db.getAll('todos');

// Queue offline changes
await db.add('pending-changes', {
  type: 'update',
  entity: 'todo',
  data: { id: 1, done: true },
  timestamp: Date.now()
});
```

**Network status hook (React):**
```jsx
function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// Usage
function App() {
  const isOnline = useNetworkStatus();

  return (
    <div>
      {!isOnline && (
        <Banner>You're offline. Changes will sync when reconnected.</Banner>
      )}
      <Content />
    </div>
  );
}
```

## Complexity / Performance

**Service Worker:**
- Setup: One-time registration, requires HTTPS (except localhost)
- Cache size: Usually 50-100 MB limit per origin
- Lifecycle: Install → Activate → Fetch (careful with updates)

**IndexedDB:**
- Storage: 50% of free disk space (per origin)
- Performance: Async, faster than localStorage
- API: Callback-based (use idb wrapper for promises)

**Sync queue:**
- Space: O(n) for n pending operations
- Time: O(n) to process queue on reconnection
- Conflict resolution: Application-specific (last-write-wins, CRDTs, etc.)

**Battery impact:**
- Background sync uses minimal battery
- Avoid aggressive polling when offline
- Use Intersection Observer for lazy loading instead of eager caching

## Real-World Examples

**PWAs with offline support:**
- **Twitter Lite**: Caches timeline, compose offline tweets
- **Flipboard**: Downloads articles for offline reading
- **Google Maps**: Offline map downloads
- **Notion**: Local-first with sync (event sourcing)
- **Linear**: Optimistic updates, offline queue

**Service Worker libraries:**
- **Workbox**: Google's toolkit for service workers
- **sw-precache**: Generate service worker for static assets
- **sw-toolbox**: Runtime caching strategies

**Example (Workbox):**
```javascript
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

// Cache images with cache-first
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 })
    ]
  })
);

// API calls with network-first
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] })
    ]
  })
);

// Static assets with stale-while-revalidate
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({ cacheName: 'static' })
);
```

**Conflict resolution strategies:**
```javascript
// 1. Last-write-wins (simple, data loss risk)
const merged = { ...cached, ...server };

// 2. Timestamps (better, requires clock sync)
const merged = cached.updatedAt > server.updatedAt ? cached : server;

// 3. Version vectors (CRDTs for complex merges)
// Used by: Notion, Figma, Apple Notes

// 4. Operational Transform (collaborative editing)
// Used by: Google Docs, Quip
```

## Related Concepts

- `./state-management.md` — TanStack Query integrates with offline strategies
- `./race-conditions.md` — Background sync must handle out-of-order completion
- `./debouncing-and-throttling.md` — Throttle connectivity checks
- `../backend/caching.md` — Server-side cache invalidation
- `../backend/message-queues.md` — Similar retry logic for failed jobs

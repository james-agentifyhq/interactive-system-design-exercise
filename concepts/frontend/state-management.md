# State Management

**What**: Patterns and libraries for managing application state, from local component state to global stores to server-synchronized data.

**When to use**: Every React app uses state; choice depends on state scope (local vs shared), update frequency, and whether data comes from a server.

**Tradeoffs**: Local state is simple but doesn't scale; global stores enable sharing but add boilerplate; server state libraries reduce boilerplate but add dependencies.

## How It Works

**State classification:**
```
State type          | Examples                    | Solutions
────────────────────────────────────────────────────────────────
Local UI            | Toggle, form input          | useState, useReducer
Lifted/shared UI    | Sidebar open, theme         | Context, prop drilling
Client cache        | Shopping cart, drafts       | Redux, Zustand, Jotai
Server cache        | API data, user profile      | TanStack Query, SWR
URL state           | Filters, pagination         | Next.js router, Remix
Form state          | Validation, touched fields  | React Hook Form, Formik
```

**Level 1: Local state**
```jsx
// useState for simple values
const [count, setCount] = useState(0);

// useReducer for complex state logic
const [state, dispatch] = useReducer(reducer, initialState);

function reducer(state, action) {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + 1 };
    case 'decrement':
      return { ...state, count: state.count - 1 };
    default:
      return state;
  }
}
```

**Level 2: Lifted state (prop drilling)**
```jsx
// State lives in parent, passed down via props
function App() {
  const [user, setUser] = useState(null);
  return (
    <Layout user={user}>
      <Sidebar user={user} />
      <Content user={user} setUser={setUser} />
    </Layout>
  );
}
// Problem: intermediate components receive props they don't use
```

**Level 3: Context API**
```jsx
// Avoids prop drilling for deeply nested components
const ThemeContext = createContext();

function App() {
  const [theme, setTheme] = useState('light');
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Layout />
    </ThemeContext.Provider>
  );
}

function DeepComponent() {
  const { theme, setTheme } = useContext(ThemeContext);
  return <button onClick={() => setTheme('dark')}>{theme}</button>;
}

// Warning: All consumers re-render when context value changes
// Use useMemo to prevent unnecessary re-renders:
const value = useMemo(() => ({ theme, setTheme }), [theme]);
```

**Level 4: External stores (client state)**
```jsx
// Redux: single store, actions, reducers (verbose but predictable)
import { createSlice, configureStore } from '@reduxjs/toolkit';

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: state => { state.value += 1; },
    decrement: state => { state.value -= 1; }
  }
});

const store = configureStore({ reducer: { counter: counterSlice.reducer } });

// In component:
const count = useSelector(state => state.counter.value);
const dispatch = useDispatch();
dispatch(counterSlice.actions.increment());

// Zustand: simpler API, no boilerplate
import create from 'zustand';

const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 }))
}));

// In component:
const { count, increment } = useStore();

// Jotai: atomic state (like Recoil)
import { atom, useAtom } from 'jotai';

const countAtom = atom(0);
const [count, setCount] = useAtom(countAtom);
```

**Level 5: Server state**
```jsx
// TanStack Query: caching, background refetching, stale-while-revalidate
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function Profile() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 5000, // Consider fresh for 5s
    refetchOnWindowFocus: true
  });

  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries(['user', userId]);
    }
  });
}

// SWR: similar to TanStack Query, smaller API
import useSWR from 'swr';

const { data, error, mutate } = useSWR(`/api/user/${userId}`, fetcher, {
  revalidateOnFocus: true,
  dedupingInterval: 2000
});
```

**When to use which:**
```
Scenario                           → Solution
─────────────────────────────────────────────────────────────────
Toggle menu, form input            → useState
Complex form with validation       → React Hook Form, Formik
Theme, auth state (app-wide)       → Context API
Shopping cart, undo/redo           → Redux, Zustand
User profile, posts (from API)     → TanStack Query, SWR
URL filters, pagination            → URL state (Next.js, Remix)
Real-time data (WebSocket)         → TanStack Query + subscriptions
Optimistic updates (likes, votes)  → TanStack Query mutations
```

## Complexity / Performance

**Context API:**
- All consumers re-render on any context value change
- Solution: Split contexts or use selectors (Zustand, Jotai)

**Redux:**
- Time: O(n) for n reducers, but optimized with immer
- Re-renders: Only components subscribed to changed slice
- DevTools: Time-travel debugging, action replay

**TanStack Query:**
- Automatic deduplication: Multiple components requesting same query → 1 request
- Background refetching: Updates data without loading states
- Garbage collection: Unused queries removed after inactivity

**Comparison:**
```
Library          | Bundle size | Learning curve | Use case
─────────────────────────────────────────────────────────────
useState         | 0 KB        | Easy           | Local state
Context          | 0 KB        | Easy           | Theme, auth
Redux Toolkit    | ~12 KB      | Medium         | Complex client state
Zustand          | ~1 KB       | Easy           | Simple global state
Jotai            | ~3 KB       | Medium         | Atomic state
TanStack Query   | ~13 KB      | Medium         | Server state
SWR              | ~5 KB       | Easy           | Server state
```

## Real-World Examples

**Redux usage:**
- **Spotify**: Player state, queue, playlists
- **Airbnb**: Search filters, booking flow

**Zustand usage:**
- **Excalidraw**: Canvas state, tool selection
- **Vercel Dashboard**: UI state, settings

**TanStack Query usage:**
- **Linear**: Issues, projects, comments
- **Notion**: Pages, databases (with optimistic updates)
- **Cal.com**: Bookings, availability

**Context API:**
- **Next.js**: ThemeProvider, AuthProvider (small apps)

**Combination approach (common):**
```jsx
// Server state: TanStack Query
const { data: user } = useQuery(['user'], fetchUser);

// Global UI state: Zustand
const { sidebarOpen, toggleSidebar } = useUIStore();

// Local state: useState
const [searchQuery, setSearchQuery] = useState('');

// Form state: React Hook Form
const { register, handleSubmit } = useForm();
```

**Anti-patterns:**
```jsx
// BAD: Storing server data in Redux
dispatch(setUser(await fetchUser())); // Use TanStack Query instead

// BAD: Prop drilling 5+ levels
<A user={user}><B user={user}><C user={user}>...</C></B></A> // Use Context

// BAD: Context for high-frequency updates
<MouseContext.Provider value={{ x, y }}> // Causes excessive re-renders

// GOOD: Use Zustand or custom subscription
const useMousePosition = create((set) => {
  useEffect(() => {
    const handler = (e) => set({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);
  return { x: 0, y: 0 };
});
```

## Related Concepts

- `./normalized-cache.md` — How TanStack Query/Redux store entities
- `./race-conditions.md` — Server state libraries handle races automatically
- `./component-api-design.md` — Context used in compound components
- `../backend/caching.md` — Server-side caching complements client cache

import { useState } from 'react';
import { Autocomplete } from './components/Autocomplete';
import type { SearchResult } from './types';

function App() {
  const [selected, setSelected] = useState<SearchResult | null>(null);

  return (
    <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '8px', color: '#1e293b' }}>
        Autocomplete Demo
      </h1>
      <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '32px', fontSize: '14px' }}>
        Frontend + Backend System Design &mdash; Trie, LRU Cache, Debouncing, Normalized Cache
      </p>

      <Autocomplete
        onSelect={setSelected}
        debounceMs={300}
        limit={10}
        minQueryLength={1}
      />

      {selected && (
        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Selected:</p>
          <p style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 600 }}>
            {selected.name}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#94a3b8' }}>
            {selected.category} &middot; score: {selected.score}
          </p>
        </div>
      )}

      <div
        style={{
          marginTop: '48px',
          padding: '20px',
          background: '#fefce8',
          borderRadius: '8px',
          border: '1px solid #fde68a',
          fontSize: '13px',
          color: '#854d0e',
          lineHeight: 1.6,
        }}
      >
        <strong>System Design Concepts Demonstrated:</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
          <li><strong>Backend</strong>: Trie (prefix tree), LRU Cache (doubly-linked list + hash map), ranking/scoring</li>
          <li><strong>Frontend</strong>: Normalized cache, debouncing, race condition handling (AbortController), keyboard nav</li>
          <li><strong>Accessibility</strong>: ARIA combobox pattern, keyboard-only navigation, screen reader support</li>
          <li><strong>Performance</strong>: O(L) prefix lookup, cache-aside pattern, debounced API calls</li>
        </ul>
        <p style={{ margin: '8px 0 0' }}>
          Open DevTools Network tab to see debouncing in action. Type the same query twice to see cache hits.
        </p>
      </div>
    </div>
  );
}

export default App;

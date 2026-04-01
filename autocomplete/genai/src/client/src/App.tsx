import { Compose } from './components/Compose';
import './components/Compose/compose.css';

function App() {
  return (
    <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '8px', color: '#1e293b' }}>
        GenAI Smart Compose
      </h1>
      <p
        style={{
          textAlign: 'center',
          color: '#64748b',
          marginBottom: '32px',
          fontSize: '14px',
        }}
      >
        AI-powered text completion with SSE streaming &amp; semantic caching
      </p>

      <Compose />

      <div
        style={{
          marginTop: '32px',
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
          <li>
            <strong>SSE Streaming</strong>: Hand-built text/event-stream (server)
            + ReadableStream parser (client)
          </li>
          <li>
            <strong>Cancellation</strong>: AbortController → server →
            stream.abort() stops LLM inference
          </li>
          <li>
            <strong>Semantic Caching</strong>: Embed context → sqlite-vec cosine
            similarity → cache hit skips LLM
          </li>
          <li>
            <strong>Trigger Strategy</strong>: 500ms pause-based debounce
            (longer than traditional 300ms due to LLM cost)
          </li>
          <li>
            <strong>Ghost Text</strong>: Overlay div with identical
            font/padding for inline suggestions
          </li>
          <li>
            <strong>Cost Tracking</strong>: Token usage, cache hit rate,
            estimated cost per session
          </li>
        </ul>
        <p style={{ margin: '8px 0 0' }}>
          Type a sentence, pause, and watch the suggestion stream in. Type the
          same thing again to see a cache hit (instant, zero tokens).
        </p>
      </div>
    </div>
  );
}

export default App;

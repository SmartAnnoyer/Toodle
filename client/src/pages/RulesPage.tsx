import { Link, useParams } from 'react-router-dom';
import { RulesEditor } from '../components/RulesEditor';

export function RulesPage() {
  const { id = '' } = useParams();

  return (
    <div className="app-bg min-h-dvh px-4 py-5">
      <div className="mx-auto max-w-[820px]">
        <Link to={`/chat/${id}`} className="text-sm text-muted">← Back to chat</Link>
        <h1 className="mt-3 text-3xl font-semibold">⚙️ Conversation rules</h1>
        <p className="mt-1 text-sm text-muted">Every chat can behave differently.</p>
        <div className="mt-5">
          <RulesEditor conversationId={id} />
        </div>
      </div>
    </div>
  );
}

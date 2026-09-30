import { Link, useParams } from 'react-router-dom';
import { ChatRules } from '../components/RulesEditor';

export function RulesPage() {
  const { id = '' } = useParams();

  return (
    <div className="app-bg h-dvh">
      <div className="mx-auto flex h-dvh max-w-[820px] flex-col">
        <div className="px-4 pt-4">
          <Link to={`/chat/${id}`} className="text-sm text-muted">← Back to chat</Link>
        </div>
        <div className="min-h-0 flex-1">
          <ChatRules conversationId={id} />
        </div>
      </div>
    </div>
  );
}

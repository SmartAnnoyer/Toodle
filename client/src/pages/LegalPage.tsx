import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen, Wordmark } from '../components/ui';
import { MIN_AGE, SUPPORT_EMAIL } from '../legal';

function Frame({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <Screen className="app-bg overflow-y-auto px-5 py-8">
      <article className="mx-auto max-w-md pb-16">
        <button type="button" className="text-sm text-muted" onClick={() => navigate(-1)}>← Back</button>
        <Wordmark className="mt-4 block text-3xl" />
        <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
        <div className="mt-6 space-y-4 text-sm leading-6">{children}</div>
      </article>
    </Screen>
  );
}

export function PrivacyPage() {
  return (
    <Frame title="Privacy policy">
      <p>Toodle is a private text chat. This policy explains what we keep and how you can remove it. Last updated 30 September 2026.</p>
      <h2 className="text-base font-semibold text-ink">What we collect</h2>
      <p>Account: email address and a password. The password is stored by our auth provider as a hash. We never show your email to other people.</p>
      <p>Profile: display name, username, emoji, and mood. Other people in Toodle can see those.</p>
      <p>Chats: messages you send, reactions, replies, and GIF or sticker picks. A chat can expire or vanish under the rules you and the other person set.</p>
      <p>Safety: if you report or block someone, we store that report, the reason, and who was involved so we can act on it.</p>
      <p>We do not sell personal information and we do not show ads.</p>
      <h2 className="text-base font-semibold text-ink">Who else handles it</h2>
      <p>Supabase stores accounts and chat data. The app is hosted so your browser can reach it. If you search GIFs, that search is sent to Giphy.</p>
      <h2 className="text-base font-semibold text-ink">How long we keep it</h2>
      <p>Messages follow the chat rules, including timers that delete them. Your account stays until you delete it.</p>
      <h2 className="text-base font-semibold text-ink">Delete your account</h2>
      <p>Open Profile, then Account and password, then Delete account. You confirm with your password. That removes the login, profile, and chats you created. You can also email {SUPPORT_EMAIL} and ask us to delete it.</p>
      <h2 className="text-base font-semibold text-ink">Age</h2>
      <p>Toodle is for people {MIN_AGE} and older. We do not want accounts from anyone younger.</p>
      <h2 className="text-base font-semibold text-ink">Contact</h2>
      <p>Privacy questions: <a className="text-primary" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
    </Frame>
  );
}

export function TermsPage() {
  return (
    <Frame title="Terms of use">
      <p>By creating a Toodle account you agree to these terms. Last updated 30 September 2026.</p>
      <p>You must be {MIN_AGE} or older. You are responsible for the messages you send.</p>
      <h2 className="text-base font-semibold text-ink">Not allowed</h2>
      <p>No harassment, hate, sexual content involving anyone under 18, spam, or threats. We have zero tolerance for that. We may remove messages and delete accounts that break these terms.</p>
      <p>Use Report and Block in a chat when someone crosses the line. We review reports and aim to act within 24 hours.</p>
      <h2 className="text-base font-semibold text-ink">Your account</h2>
      <p>Keep your password to yourself. You can reset it from the login screen, change it in Account and password, and delete the account there. Deleting it removes the login and the chats you created.</p>
      <p>Questions: <a className="text-primary" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
    </Frame>
  );
}

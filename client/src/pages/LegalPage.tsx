import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Screen, Wordmark } from '../components/ui';
import { MIN_AGE, SAFETY_EMAIL, SUPPORT_EMAIL } from '../legal';

const DELETE_MAIL = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Delete my Toodle account')}&body=${encodeURIComponent('Please delete my Toodle account and the data associated with it.\n\nAccount email:\nUsername:\n')}`;

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
      <p>You can delete the account and the data associated with it from the <Link to="/delete-account" className="text-primary underline">delete account page</Link>. In the app, open Profile, then Account and password, then Delete account, and confirm with your password. That removes the login, profile, and chats you created.</p>
      <h2 className="text-base font-semibold text-ink">Age</h2>
      <p>Toodle is for people {MIN_AGE} and older. We do not want accounts from anyone younger.</p>
      <h2 className="text-base font-semibold text-ink">Contact</h2>
      <p>Privacy questions: <a className="text-primary" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
      <p>Child safety: <Link to="/child-safety" className="text-primary underline">Child safety standards</Link></p>
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
      <p>Use Report and Block in a chat when someone crosses the line. We review reports and aim to act within 24 hours. Our <Link to="/child-safety" className="text-primary underline">child safety standards</Link> explain how to report child sexual abuse and exploitation.</p>
      <h2 className="text-base font-semibold text-ink">Your account</h2>
      <p>Keep your password to yourself. You can reset it from the login screen, change it in Account and password, and delete the account there. Deleting it removes the login, profile, and chats you created. You can also use the <Link to="/delete-account" className="text-primary underline">delete account page</Link>.</p>
      <p>Questions: <a className="text-primary" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
    </Frame>
  );
}

export function DeleteAccountPage() {
  return (
    <Frame title="Delete your account">
      <p>Use this page to delete your Toodle account and the data associated with it. Last updated 2 October 2026.</p>
      <h2 className="text-base font-semibold text-ink">What gets deleted</h2>
      <p>Your login, email account, profile (display name, username, emoji, and mood), messages you sent, reactions, and the chats you created.</p>
      <h2 className="text-base font-semibold text-ink">Delete it in the app</h2>
      <p>Sign in, open Profile, then Account and password, then Delete account. Confirm with your password. This is immediate and cannot be undone.</p>
      <p><Link to="/login" className="text-primary underline">Sign in to delete your account</Link></p>
      <h2 className="text-base font-semibold text-ink">Cannot sign in?</h2>
      <p>Email us from the address on the account, or include that email and your username. We will delete the account and the associated data.</p>
      <p><a className="text-primary underline" href={DELETE_MAIL}>Request account deletion</a></p>
      <p>Send it to <a className="text-primary" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
    </Frame>
  );
}

export function ChildSafetyPage() {
  return (
    <Frame title="Child safety standards">
      <p>These are Toodle’s published standards against child sexual abuse and exploitation. Last updated 8 October 2026.</p>
      <h2 className="text-base font-semibold text-ink">Not allowed</h2>
      <p>Toodle has zero tolerance for child sexual abuse material and for sexual content or grooming involving anyone under 18. Accounts that do this are removed.</p>
      <p>Toodle is for people {MIN_AGE} and older. The app does not allow photo or video uploads.</p>
      <h2 className="text-base font-semibold text-ink">Report it in the app</h2>
      <p>Open the chat, open the other person’s name, then choose Report. Pick sexual or other, describe what happened, and send. You can also block that person in the same place.</p>
      <h2 className="text-base font-semibold text-ink">What we do</h2>
      <p>Reports are stored and reviewed. We remove the content and delete the account when a report shows a violation. When we confirm child sexual abuse material, we report it to the relevant regional and national authorities.</p>
      <h2 className="text-base font-semibold text-ink">Contact</h2>
      <p>Child safety contact: <a className="text-primary" href={`mailto:${SAFETY_EMAIL}`}>{SAFETY_EMAIL}</a></p>
    </Frame>
  );
}

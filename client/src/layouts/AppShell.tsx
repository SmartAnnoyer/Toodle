import { NavLink, Outlet } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { Screen } from '../components/ui';

const items = [
  { to: '/', label: 'Home', emoji: '💬', end: true },
  { to: '/requests', label: 'Requests', emoji: '👋', end: false },
  { to: '/shortcuts', label: 'Shortcuts', emoji: '⚡', end: false },
  { to: '/profile', label: 'Profile', emoji: '✨', end: false },
];

export function AppShell() {
  const { banner } = useSocket();
  return (
    <Screen className="app-bg nav-safe">
      {banner ? (
        <div className="sticky top-0 z-30 px-4 pt-3">
          <div className="glass mx-auto max-w-sm rounded-full px-4 py-2 text-center text-sm">{banner}</div>
        </div>
      ) : null}
      <Outlet />
      <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="glass mx-auto flex max-w-[820px] items-center justify-around rounded-full px-2 py-2">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `flex min-w-16 flex-col items-center rounded-full px-3 py-1 text-xs transition-none ${isActive ? 'bg-white/10 text-ink' : 'text-muted'}`}
            >
              <span className="text-lg">{item.emoji}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </Screen>
  );
}

import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { sendPasswordResetEmail, signOut } from 'firebase/auth';
import { Tv, PlaySquare, Sword, BookOpen, LayoutDashboard, LogOut, KeyRound } from 'lucide-react';
import { auth } from '../firebase';
import { useToast } from '../context/toast';

export function Sidebar() {
  const [isSendingReset, setIsSendingReset] = useState(false);
  const { showToast } = useToast();

  const handlePasswordReset = async () => {
    const email = auth.currentUser?.email;

    if (!email) {
      showToast('Could not find an email address for this account.', 'error');
      return;
    }

    try {
      setIsSendingReset(true);
      await sendPasswordResetEmail(auth, email);
      showToast(`Password reset email sent to ${email}.`, 'success');
    } catch (error) {
      console.error('Error sending password reset email', error);
      showToast('Could not send a password reset email. Please try again.', 'error');
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <aside className="sidebar">
      <div>
        <h1>MediaTracker</h1>
      
        <nav className="nav-links">
          <NavLink to="/" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`} end>
            <LayoutDashboard size={20} />
            Dashboard
          </NavLink>
          <NavLink to="/category/tv" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <Tv size={20} />
            TV Shows
          </NavLink>
          <NavLink to="/category/anime-jp" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <PlaySquare size={20} />
            Japanese Anime
          </NavLink>
          <NavLink to="/category/anime-cn" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <Sword size={20} />
            Chinese Anime
          </NavLink>
          <NavLink to="/category/manga" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            <BookOpen size={20} />
            Manga & Manhwa
          </NavLink>
        </nav>
      </div>

      <div className="sidebar-actions">
        <button className="nav-link sidebar-action-button" onClick={handlePasswordReset} disabled={isSendingReset}>
          <KeyRound size={20} />
          {isSendingReset ? 'Sending...' : 'Change Password'}
        </button>

        <button className="nav-link sidebar-action-button logout-button" onClick={() => signOut(auth)}>
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

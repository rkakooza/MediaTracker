import { NavLink } from 'react-router-dom';
import { Tv, PlaySquare, Sword, BookOpen, LayoutDashboard } from 'lucide-react';

export function Sidebar() {
  return (
    <aside className="sidebar">
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
    </aside>
  );
}

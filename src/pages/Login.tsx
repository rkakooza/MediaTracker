import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/auth';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { PlaySquare } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();

  // If already logged in, redirect to the dashboard!
  if (currentUser) {
    return <Navigate to="/" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Signup is intentionally disabled while MediaTracker is a personal app.
      // To re-enable it later, restore createUserWithEmailAndPassword and the signup toggle below.
      // if (isLogin) {
      //   await signInWithEmailAndPassword(auth, email, password);
      // } else {
      //   await createUserWithEmailAndPassword(auth, email, password);
      // }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to authenticate.');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-dark)' }}>
      <div className="media-card" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <PlaySquare size={48} color="var(--accent-purple)" style={{ marginBottom: '1rem' }} />
          <h2>MediaTracker</h2>
        </div>
        
        {error && <div style={{ color: 'var(--accent-red)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.2)', color: 'white' }}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.2)', color: 'white' }}
            required
          />
          <button type="submit" className="btn-primary">
            Sign In
          </button>
        </form>
        
        {/* <button 
          onClick={() => setIsLogin(!isLogin)}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', marginTop: '1rem', cursor: 'pointer' }}
        >
          {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button> */}
      </div>
    </div>
  );
}

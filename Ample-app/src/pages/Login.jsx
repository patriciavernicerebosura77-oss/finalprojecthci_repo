import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, githubProvider } from '@/api/firebase'; // Kumokonekta sa bago mong firebase.js file

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Pinapatakbo ang Firebase login command gamit ang email at password inputs
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = '/';
    } catch (err) {
      console.error('Login error details:', err);
      // Nililinis ang Firebase raw error code para mas madaling basahin ng gumagamit ang alert box
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Maling email o password. Pakisuyong suriin at subukan muli.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Hindi wasto ang format ng email address na iyong isinulat.');
      } else {
        setError(err.message || 'May hindi inaasahang isyu habang nagpa-proseso ng login authentication request.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      // Pinapagana ang popup dialogue screen window para sa mabilis na Google account selection
      await signInWithPopup(auth, googleProvider);
      window.location.href = '/';
    } catch (err) {
      console.error('Google authorization failure tracker:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Hindi nagtagumpay ang koneksyon sa Google account verification server platform.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGithub = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, githubProvider);
      window.location.href = '/';
    } catch (err) {
      console.error('GitHub authorization failure tracker:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Hindi nagtagumpay ang koneksyon sa GitHub account verification server platform.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/20">
            <span className="text-white font-bold text-xl">V</span>
          </div>
          <h1 className="font-heading font-bold text-2xl">Welcome Back</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to VoiceTranslate</p>
        </div>

        <div className="rounded-2xl glass-strong p-6 shadow-xl space-y-4">
          <div className="space-y-2">
            <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
              Sign in with Google
            </Button>
            <Button variant="outline" className="w-full" onClick={handleGithub} disabled={loading}>
              Sign in with GitHub
            </Button>
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="name@example.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-foreground">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  className="pl-9 pr-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Register
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

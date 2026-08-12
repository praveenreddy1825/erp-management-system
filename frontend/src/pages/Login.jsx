import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';

const Login = () => {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    const result = await login(email, password);
    setSubmitting(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setErrorMsg(result.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-950 px-4">
      <div className="max-w-md w-full bg-emerald-900/40 border border-emerald-800 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-white tracking-wide">Welcome Back</h2>
          <p className="mt-2 text-sm text-yellow-400 font-bold">Sign in to access your portal</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950 border border-red-800 text-red-200 rounded-lg text-sm text-center font-semibold">
            {errorMsg}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-bold text-emerald-250 mb-2">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-emerald-950/80 border border-emerald-700 text-white rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 text-sm font-semibold transition-all placeholder-emerald-700"
              placeholder="name@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-emerald-250 mb-2">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-emerald-950/80 border border-emerald-700 text-white rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 text-sm font-semibold transition-all placeholder-emerald-700"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-emerald-950 font-black rounded-lg text-sm transition-all shadow-md shadow-yellow-500/25 cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
         <div className="mt-6 text-center text-sm text-gray-300">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="text-yellow-400 hover:text-yellow-300 font-black hover:underline cursor-pointer bg-transparent border-none"
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;

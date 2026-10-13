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
    <div className="min-h-screen flex items-center justify-center bg-[#F5F2EB] px-4">
      <div className="max-w-md w-full bg-[#FCFBF8] border border-[#E2DDCF] rounded-2xl p-8 shadow-xl shadow-stone-900/5">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-amber-400 flex items-center justify-center text-stone-950 font-black text-xl shadow-sm">
            E
          </div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">Welcome Back</h2>
          <p className="mt-1 text-sm text-stone-600 font-semibold">Sign in to your ERP business portal</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm text-center font-semibold">
            {errorMsg}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-[#D9D3C5] text-stone-900 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-sm font-semibold transition-all placeholder-stone-400"
              placeholder="name@company.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-[#D9D3C5] text-stone-900 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-sm font-semibold transition-all placeholder-stone-400"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-stone-950 font-black rounded-xl text-sm transition-all shadow-md shadow-amber-400/25 cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-stone-600">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="text-amber-600 hover:text-amber-700 font-black hover:underline cursor-pointer bg-transparent border-none"
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;

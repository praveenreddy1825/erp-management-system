import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';

const Register = () => {
  const { register } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Customer'); // Defaults to Customer
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    const result = await register(name, email, password, phone, role);
    setSubmitting(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setErrorMsg(result.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F2EB] py-12 px-4">
      <div className="max-w-md w-full bg-[#FCFBF8] border border-[#E2DDCF] rounded-2xl p-8 shadow-xl shadow-stone-900/5">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-amber-400 flex items-center justify-center text-stone-950 font-black text-xl shadow-sm">
            E
          </div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">Create Account</h2>
          <p className="mt-1 text-sm text-stone-600 font-semibold">Sign up for your business ERP portal</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm text-center font-semibold">
            {errorMsg}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-[#D9D3C5] text-stone-900 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-sm font-semibold transition-all placeholder-stone-400"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Email Address</label>
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
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Phone Number</label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-[#D9D3C5] text-stone-900 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-sm font-semibold transition-all placeholder-stone-400"
              placeholder="+123456789"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-[#D9D3C5] text-stone-900 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-sm font-semibold transition-all placeholder-stone-400"
              placeholder="Min. 8 chars, 1 number, 1 special char"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">Your Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-[#D9D3C5] text-stone-900 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-sm font-semibold transition-all cursor-pointer"
            >
              <option value="Customer">Customer (External Client)</option>
              <option value="Sales_Manager">Sales Manager (Employee)</option>
              <option value="Purchase_Manager">Purchase Manager (Employee)</option>
              <option value="Inventory_Manager">Inventory Manager (Employee)</option>
              <option value="Admin">System Administrator</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 mt-3 bg-amber-400 hover:bg-amber-500 text-stone-950 font-black rounded-xl text-sm transition-all shadow-md shadow-amber-400/25 cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Registering...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-stone-600">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-amber-600 hover:text-amber-700 font-black hover:underline cursor-pointer bg-transparent border-none"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;

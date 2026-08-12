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
    <div className="min-h-screen flex items-center justify-center bg-emerald-950 py-12 px-4">
      <div className="max-w-md w-full bg-emerald-900/40 border border-emerald-800 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-white tracking-wide">Create Account</h2>
          <p className="mt-2 text-sm text-yellow-400 font-bold">Sign up to access your business portal</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950 border border-red-800 text-red-200 rounded-lg text-sm text-center font-semibold">
            {errorMsg}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-bold text-emerald-250 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-emerald-955 border border-emerald-700 text-white rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 text-sm font-semibold transition-all placeholder-emerald-700"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-emerald-250 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-emerald-955 border border-emerald-700 text-white rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 text-sm font-semibold transition-all placeholder-emerald-700"
              placeholder="name@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-emerald-250 mb-1">Phone Number</label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 bg-emerald-955 border border-emerald-700 text-white rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 text-sm font-semibold transition-all placeholder-emerald-700"
              placeholder="+123456789"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-emerald-250 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-emerald-955 border border-emerald-700 text-white rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 text-sm font-semibold transition-all placeholder-emerald-700"
              placeholder="Min. 8 chars, 1 number, 1 special char"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-emerald-250 mb-1">Your Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2.5 bg-emerald-955 border border-emerald-700 text-white rounded-lg focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 text-sm font-semibold transition-all"
            >
              <option value="Customer" className="bg-emerald-900 text-white">Customer (External Client)</option>
              <option value="Sales_Manager" className="bg-emerald-900 text-white">Sales Manager (Employee)</option>
              <option value="Purchase_Manager" className="bg-emerald-900 text-white">Purchase Manager (Employee)</option>
              <option value="Inventory_Manager" className="bg-emerald-900 text-white">Inventory Manager (Employee)</option>
              <option value="Admin" className="bg-emerald-900 text-white">System Administrator</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 mt-4 bg-yellow-400 hover:bg-yellow-500 text-emerald-950 font-black rounded-lg text-sm transition-all shadow-md shadow-yellow-500/25 cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Registering...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-300">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-yellow-400 hover:text-yellow-300 font-black hover:underline cursor-pointer bg-transparent border-none"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;

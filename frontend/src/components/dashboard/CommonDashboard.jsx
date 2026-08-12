import React from 'react';
import HomeIcon from '@mui/icons-material/Home';

const CommonDashboard = ({ user }) => {
  return (
    <div className="bg-white p-8 rounded-xl border border-gray-150 shadow-sm text-center max-w-xl mx-auto space-y-4">
      <div className="p-4 bg-emerald-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto border border-emerald-100">
        <HomeIcon className="text-emerald-700 !w-8 !h-8" />
      </div>
      <h2 className="text-xl font-bold text-gray-800">Welcome to the ERP Portal</h2>
      <p className="text-gray-500 text-sm">
        Hello {user?.name || 'User'}, you have logged in as <span className="font-bold text-emerald-800 uppercase bg-yellow-100 px-2 py-0.5 rounded border border-yellow-200 text-xs">{user?.role || 'Guest'}</span>.
      </p>
      <p className="text-gray-400 text-xs">
        Use the sidebar navigation to view and manage ERP catalog entries, orders, invoices, and supplier receipts.
      </p>
    </div>
  );
};

export default CommonDashboard;

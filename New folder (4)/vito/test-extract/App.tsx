import React from 'react';
import './App.css';

export default function App() {
  return (
    <div className="h-screen w-full flex justify-center items-center bg-gray-100">
      <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-md">
        <h2 className="text-lg font-bold mb-4">Build Started from Dashboard</h2>
        <p className="mb-8 text-gray-600">This is the starting point for your build.</p>
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Start Build
        </button>
      </div>
    </div>
  );
}
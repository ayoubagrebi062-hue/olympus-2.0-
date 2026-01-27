import Link from 'next/link';

export default function Page() {
  return (
    <div className="h-screen flex justify-center items-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Todo App</h1>
        <p className="text-lg mb-8">Manage your tasks with ease.</p>
        <div className="space-x-4">
          <Link
            href="/login"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
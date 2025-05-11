'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function SigninPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignin = async (e) => {
    e.preventDefault();
    const result = await signIn('credentials', {
      redirect: false,
      username: email,
      password,
    });

    if (result?.error) {
      setError('Invalid credentials');
    } else {
      router.push('/');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-mono-medium rounded-md">
      <h1 className="text-2xl font-bold mb-4">Sign In</h1>
      <form onSubmit={handleSignin}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="p-2 mb-2 border rounded w-full"
        />
        <input
          value={password}
          type="password"
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="p-2 mb-2 border rounded w-full"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Sign In
        </button>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </form>
      <p className="mt-4">
        Don&apos;t have an account?{' '}
        <a href="/signup" className="text-blue-600 hover:underline">
          Sign Up
        </a>
      </p>
    </div>
  );
}
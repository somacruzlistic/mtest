'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      // Automatically sign in after signup
      const signInResult = await signIn('credentials', {
        redirect: false,
        username: email,
        password,
      });

      if (signInResult?.error) {
        setError('Signup succeeded, but sign-in failed');
      } else {
        router.push('/');
      }
    } else {
      const data = await res.json();
      setError(data.error || 'Signup failed');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-mono-medium rounded-md">
      <h1 className="text-2xl font-bold mb-4">Sign Up</h1>
      <form onSubmit={handleSignup}>
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
        <input
          value={confirmPassword}
          type="password"
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm Password"
          className="p-2 mb-2 border rounded w-full"
        />
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Sign Up
        </button>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </form>
      <p className="mt-4">
        Already have an account?{' '}
        <a href="/signin" className="text-blue-600 hover:underline">
          Sign In
        </a>
      </p>
    </div>
  );
}
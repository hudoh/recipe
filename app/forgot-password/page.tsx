'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      setError(error);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-4">📧</div>
          <h1 className="text-2xl font-bold text-espresso mb-2">Check your email</h1>
          <p className="text-espresso/60 mb-6">
            We sent a password reset link to <strong>{email}</strong>.<br/>
            Click the link in the email to reset your password.
          </p>
          <Link href="/login" className="text-caramel hover:underline">Back to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-espresso">📖 Recipe Manager</Link>
          <p className="text-espresso/60 mt-2">Reset your password</p>
        </div>

        <div className="bg-white rounded-xl border border-espresso/10 p-8 shadow-md">
          <p className="text-espresso/70 text-sm mb-6">
            Enter your email and we'll send you a link to reset your password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-espresso mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}

            <button type="submit" disabled={loading} className="btn-caramel w-full disabled:opacity-50">
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link href="/login" className="text-espresso/60 hover:text-caramel">← Back to sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

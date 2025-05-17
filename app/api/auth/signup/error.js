'use client';

export default function Error({ error, reset }) {
  return {
    message: 'Failed to initialize database connection',
    status: 500
  };
} 
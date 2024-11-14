'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export default function LandingPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [loading, user, router]);

  if (loading) {
    return null; // Or a loading spinner
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="flex flex-col items-center">
          <Image
            src="/goodnoise-logo.svg"
            alt="Goodnoise AI Logo"
            width={64}
            height={64}
            priority
          />
          <h1 className="mt-6 text-4xl font-bold">goodsound.ai</h1>
          <p className="mt-2 text-xl text-muted-foreground">
            Create, customize, and export high-quality UI sounds powered by AI
          </p>
        </div>
        
        <Button
          size="lg"
          className="w-full max-w-xs mx-auto"
          onClick={signIn}
        >
          Sign in with Google
        </Button>
      </div>
    </div>
  );
}

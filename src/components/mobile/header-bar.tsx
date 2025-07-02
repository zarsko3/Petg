'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun, Heart, LogOut, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SignOutButton, useUser, SignInButton } from '@clerk/nextjs';

export default function HeaderBar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user, isSignedIn, isLoaded } = useUser();

  // Ensure component is mounted to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <header className="fixed top-0 w-full bg-pet-surface-elevated/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 z-40 safe-area-top">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-teal-300 to-teal-400 dark:from-teal-600 dark:to-teal-700 rounded-2xl flex items-center justify-center shadow-teal-glow">
              <Heart className="h-5 w-5 text-teal-700 dark:text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white font-rounded">
                PETg
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Keeping your pet safe
              </p>
            </div>
          </div>
          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
        </div>
      </header>
    );
  }

  return (
    <header className="fixed top-0 w-full bg-pet-surface-elevated/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-pet-sm z-40 safe-area-top">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-teal-300 to-teal-400 dark:from-teal-600 dark:to-teal-700 rounded-2xl flex items-center justify-center shadow-teal-glow">
            <Heart className="h-5 w-5 text-teal-700 dark:text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white font-rounded">
              PETg
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Keeping your pet safe & happy
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-all duration-200 mobile-button shadow-pet hover:shadow-pet-lg"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5 text-amber-500" />
            ) : (
              <Moon className="h-5 w-5 text-slate-600" />
            )}
          </button>

          {/* Authentication Buttons */}
          {!isLoaded ? (
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ) : isSignedIn ? (
            <SignOutButton>
              <button
                aria-label={`Sign out (${user?.emailAddresses[0]?.emailAddress || 'user'})`}
                className="flex items-center justify-center w-12 h-12 rounded-2xl bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 transition-all duration-200 mobile-button shadow-pet hover:shadow-pet-lg"
              >
                <LogOut className="h-5 w-5 text-red-600 dark:text-red-400" />
              </button>
            </SignOutButton>
          ) : (
            <SignInButton mode="modal">
              <button
                aria-label="Sign in"
                className="flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 transition-all duration-200 mobile-button shadow-pet hover:shadow-pet-lg"
              >
                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </header>
  );
} 
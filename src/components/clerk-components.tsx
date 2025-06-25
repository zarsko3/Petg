'use client';

import { useUser, SignOutButton, SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { LogOut, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePetgStore } from "@/lib/store";
import { useEffect } from "react";

// Welcome message that uses Clerk's user data
export function WelcomeMessage() {
  const { isSignedIn, user } = useUser();
  const { setUser } = usePetgStore();
  
  useEffect(() => {
    // Update the Petg store with Clerk user data
    if (user) {
      setUser({
        name: user.firstName || user.username || 'משתמש'
      });
    }
  }, [user, setUser]);
  
  return (
    <>{isSignedIn ? `שלום, ${user?.firstName || user?.username || 'משתמש'}!` : 'ברוכים הבאים!'}</>
  );
}

// Auth button that handles sign in/out with Clerk
export function AuthButton() {
  const { isSignedIn } = useUser();
  
  if (isSignedIn) {
    return (
      <SignOutButton>
        <Button 
          variant="ghost" 
          size="icon"
          className="text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
        >
          <LogOut className="h-5 w-5" />
          <span className="sr-only">התנתקות</span>
        </Button>
      </SignOutButton>
    );
  }
  
  return (
    <Link href="/sign-in">
      <Button 
        variant="ghost" 
        size="icon"
        className="text-purple-500 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/20"
      >
        <LogIn className="h-5 w-5" />
        <span className="sr-only">התחברות</span>
      </Button>
    </Link>
  );
}

// Default export for dynamic import
export default {
  WelcomeMessage,
  AuthButton
}; 
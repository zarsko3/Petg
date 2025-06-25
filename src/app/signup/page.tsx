'use client';

import { useEffect, useState } from 'react';
import { SignUp } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Dog, Shield, Heart, CheckCircle } from 'lucide-react';

export default function SignUpPage() {
  const [mounted, setMounted] = useState(false);
  const [isClerkAvailable, setIsClerkAvailable] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    
    // Check if Clerk is available (API key is set)
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
    setIsClerkAvailable(!!publishableKey && !publishableKey.includes('YOUR_PUBLISHABLE_KEY'));
  }, []);

  // Note: User redirect logic moved to middleware for better build compatibility

  const handleDemoSignUp = () => {
    setIsLoading(true);
    // Simulate loading for demo
    setTimeout(() => {
      router.push('/');
    }, 1500);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Left Section - Features & Branding */}
        <div className="lg:w-1/2 bg-gradient-to-br from-blue-600 to-purple-700 text-white p-8 lg:p-12 flex flex-col justify-center relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-32 h-32 bg-white rounded-full"></div>
            <div className="absolute bottom-20 right-20 w-24 h-24 bg-white rounded-full"></div>
            <div className="absolute top-1/2 right-32 w-16 h-16 bg-white rounded-full"></div>
          </div>

          <div className="relative z-10">
            {/* Logo and brand */}
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-white/20 p-3 rounded-xl">
                <Dog className="h-8 w-8" />
              </div>
              <h1 className="text-3xl font-bold">PETg</h1>
            </div>

            {/* Main heading */}
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              Join the Future of<br />Pet Care Technology
            </h2>
            <p className="text-xl text-blue-100 mb-12 leading-relaxed">
              Create your account and start monitoring your pets with cutting-edge BLE technology and AI-powered insights.
            </p>

            {/* Feature highlights */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="bg-white/20 p-2 rounded-lg mt-1">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Advanced Security</h3>
                  <p className="text-blue-100">Enterprise-grade encryption keeps your pet's data safe and secure</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-white/20 p-2 rounded-lg mt-1">
                  <Heart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">24/7 Monitoring</h3>
                  <p className="text-blue-100">Round-the-clock tracking with instant alerts and notifications</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="bg-white/20 p-2 rounded-lg mt-1">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Easy Setup</h3>
                  <p className="text-blue-100">Get started in minutes with our simple onboarding process</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Sign Up Form */}
        <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-md">
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
                <CardDescription>
                  Join PETg to start monitoring and protecting your pets
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {isClerkAvailable ? (
                  <div className="space-y-4">
                    <SignUp
                      appearance={{
                        elements: {
                          formButtonPrimary: 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-sm normal-case font-medium transition-all duration-200 shadow-lg hover:shadow-xl',
                          card: 'bg-transparent shadow-none p-0 border-0',
                          headerTitle: 'hidden',
                          headerSubtitle: 'hidden',
                          footerAction: 'hidden',
                          formFieldInput: 'border-gray-200 dark:border-gray-700 focus:border-purple-500 dark:focus:border-purple-400 rounded-xl px-4 py-3',
                          formFieldLabel: 'text-gray-700 dark:text-gray-300 font-medium',
                          dividerLine: 'bg-gray-200 dark:bg-gray-700',
                          dividerText: 'text-gray-500 dark:text-gray-400',
                          socialButtonsBlockButton: 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors',
                          footerActionLink: 'text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300'
                        },
                        variables: {
                          colorPrimary: '#9333ea',
                          borderRadius: '0.75rem'
                        }
                      }}
                      redirectUrl="/"
                      signInUrl="/login"
                    />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          type="text"
                          placeholder="John Doe"
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          className="rounded-xl"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        id="terms"
                        className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 mt-1"
                      />
                      <label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        I agree to the{' '}
                        <Link href="#" className="text-purple-600 hover:text-purple-700 dark:text-purple-400 font-medium">
                          Terms of Service
                        </Link>
                        {' '}and{' '}
                        <Link href="#" className="text-purple-600 hover:text-purple-700 dark:text-purple-400 font-medium">
                          Privacy Policy
                        </Link>
                      </label>
                    </div>

                    <Button 
                      onClick={handleDemoSignUp}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        'Create account'
                      )}
                    </Button>
                    
                    <div className="text-center">
                      <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                        <span className="text-amber-500">⚠️</span> Demo mode - Clerk not configured
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="flex flex-col space-y-4">
                <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium"
                  >
                    Sign in
                  </Link>
                </div>
                
                <div className="text-center">
                  <Link
                    href="/"
                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    Continue to dashboard →
                  </Link>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 
import React from 'react';
import { useClerk, useUser } from '@clerk/clerk-react';

interface SignInButtonProps {
  mode?: 'modal' | 'redirect';
  children?: React.ReactNode;
  className?: string;
}

export const SignInButton: React.FC<SignInButtonProps> = ({ 
  mode = 'modal', 
  children,
  className = ''
}) => {
  const { openSignIn } = useClerk();
  const { isSignedIn } = useUser();

  if (isSignedIn) return null;

  const handleClick = () => {
    openSignIn({
      afterSignInUrl: '/',
      redirectUrl: '/',
    });
  };

  return (
    <button onClick={handleClick} className={className}>
      {children || 'Sign In'}
    </button>
  );
};

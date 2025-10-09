import React from 'react';
import { useClerk, useUser } from '@clerk/clerk-react';

interface SignUpButtonProps {
  mode?: 'modal' | 'redirect';
  children?: React.ReactNode;
  className?: string;
}

export const SignUpButton: React.FC<SignUpButtonProps> = ({ 
  mode = 'modal', 
  children,
  className = ''
}) => {
  const { openSignUp } = useClerk();
  const { isSignedIn } = useUser();

  if (isSignedIn) return null;

  const handleClick = () => {
    openSignUp({
      afterSignUpUrl: '/',
      redirectUrl: '/',
    });
  };

  return (
    <button onClick={handleClick} className={className}>
      {children || 'Sign Up'}
    </button>
  );
};

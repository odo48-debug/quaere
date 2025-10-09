import React from 'react';
import { UserButton as ClerkUserButton, useUser } from '@clerk/clerk-react';
import { useSubscription } from '../../hooks/useSubscription';

interface UserButtonProps {
  openUpwards?: boolean;
}

export const UserButton: React.FC<UserButtonProps> = ({ openUpwards = false }) => {
  return (
    <ClerkUserButton 
      appearance={{
        elements: {
          avatarBox: "w-10 h-10",
          userButtonPopoverCard: "shadow-xl",
        }
      }}
      afterSignOutUrl="/"
    />
  );
};

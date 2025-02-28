import { User } from '../store/user';

export function formatUserDisplay(user: User | null | undefined): string {
  if (!user) return 'Unassigned';
  
  const firstName = user.first_name?.trim();
  const lastName = user.last_name?.trim();
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  
  return user.email.split('@')[0];
}
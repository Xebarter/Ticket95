import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface AuthErrorProps {
  error: string;
}

export function AuthError({ error }: AuthErrorProps) {
  // Map common Supabase error messages to user-friendly ones
  const getFriendlyMessage = (errorMessage: string): string => {
    const lowerError = errorMessage.toLowerCase();
    
    if (lowerError.includes('invalid login credentials')) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    
    if (lowerError.includes('email not confirmed')) {
      return 'Please verify your email address. Check your inbox for the verification link.';
    }
    
    if (lowerError.includes('user already registered')) {
      return 'An account with this email already exists. Please sign in instead.';
    }
    
    if (lowerError.includes('password should be at least')) {
      return 'Password must be at least 8 characters long.';
    }
    
    if (lowerError.includes('invalid email')) {
      return 'Please enter a valid email address.';
    }
    
    if (lowerError.includes('network')) {
      return 'Network error. Please check your internet connection and try again.';
    }
    
    if (lowerError.includes('too many requests')) {
      return 'Too many attempts. Please wait a few minutes before trying again.';
    }
    
    // Return original message if no mapping found
    return errorMessage;
  };

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{getFriendlyMessage(error)}</AlertDescription>
    </Alert>
  );
}

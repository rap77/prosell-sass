'use client';

/**
 * Accept Team Invitation Page
 *
 * This page handles the team invitation acceptance flow:
 * 1. User clicks email link with token: /invite/abc123...
 * 2. Page validates token with backend
 * 3. User is added to team
 * 4. Redirect to dashboard with success message
 *
 * Error states:
 * - Invalid token → Show error, option to go home
 * - Expired token → Show error, option to request new invitation
 * - Already member → Show message, redirect to dashboard
 * - Not logged in → Redirect to login with invitation token saved
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { teamApi, ApiError } from '@/lib/api/teamApi';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

type InvitationState = 'loading' | 'success' | 'error' | 'expired' | 'already_member';

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [state, setState] = useState<InvitationState>('loading');
  const [message, setMessage] = useState<string>('');
  const [teamName, setTeamName] = useState<string>('');

  const acceptInvitation = useCallback(async () => {
    try {
      const member = await teamApi.acceptInvitation({ token });

      setState('success');
      setTeamName(member.team_id || 'the team');
      setMessage('You have successfully joined the team!');

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard?welcome=team');
      }, 2000);
    } catch (error) {
      if (error instanceof ApiError) {
        const errorMessage = error.message.toLowerCase();

        if (errorMessage.includes('expired')) {
          setState('expired');
          setMessage('This invitation has expired. Please ask your team admin for a new invitation.');
        } else if (errorMessage.includes('already') || errorMessage.includes('member')) {
          setState('already_member');
          setMessage('You are already a member of this team.');
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        } else if (error.status === 401) {
          // User not logged in - redirect to login with return URL
          const returnUrl = encodeURIComponent(`/invite/${token}`);
          router.push(`/auth/login?returnTo=${returnUrl}`);
        } else {
          setState('error');
          setMessage(error.message || 'Failed to accept invitation. Please try again or contact support.');
        }
      } else {
        setState('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    }
  }, [token, router]);

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- guard pattern, not a cascade
      setState('error');
      setMessage('No invitation token provided');
      return;
    }
    void acceptInvitation();
  }, [token, acceptInvitation]);

  const renderContent = () => {
    switch (state) {
      case 'loading':
        return (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <p className="text-muted-foreground">Accepting your invitation...</p>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center gap-4">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-green-600">Welcome to the team!</h3>
              <p className="text-muted-foreground">{message}</p>
            </div>
            <p className="text-sm text-muted-foreground">Redirecting you to dashboard...</p>
          </div>
        );

      case 'expired':
        return (
          <div className="flex flex-col items-center gap-4">
            <XCircle className="h-12 w-12 text-red-600" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-600">Invitation Expired</h3>
              <p className="text-muted-foreground">{message}</p>
            </div>
            <Button onClick={() => router.push('/')} variant="outline">
              Go to Homepage
            </Button>
          </div>
        );

      case 'already_member':
        return (
          <div className="flex flex-col items-center gap-4">
            <CheckCircle2 className="h-12 w-12 text-blue-600" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-blue-600">Already a Member</h3>
              <p className="text-muted-foreground">{message}</p>
            </div>
            <p className="text-sm text-muted-foreground">Redirecting you to dashboard...</p>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-12 w-12 text-orange-600" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-orange-600">Unable to Accept Invitation</h3>
              <p className="text-muted-foreground">{message}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => router.push('/')} variant="outline">
                Go to Homepage
              </Button>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Team Invitation</CardTitle>
          <CardDescription>
            {state === 'loading' && 'Please wait while we process your invitation...'}
            {state === 'success' && 'Invitation accepted successfully!'}
            {(state === 'error' || state === 'expired') && 'We could not process your invitation'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}

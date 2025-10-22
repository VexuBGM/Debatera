'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Shield, Loader2 } from 'lucide-react';

interface VerificationStatusProps {
  tournamentId: string;
  isVerified: boolean;
  verificationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  verificationNote?: string;
  requestedAt?: string;
  reviewedAt?: string;
  isOrganizer?: boolean;
  isAdmin?: boolean;
  onRequestVerification?: () => void;
  onApprove?: (note: string) => Promise<void>;
  onReject?: (note: string) => Promise<void>;
}

export function VerificationStatus({
  tournamentId,
  isVerified,
  verificationStatus,
  verificationNote,
  requestedAt,
  reviewedAt,
  isOrganizer = false,
  isAdmin = false,
  onRequestVerification,
  onApprove,
  onReject,
}: VerificationStatusProps) {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminAction, setAdminAction] = useState<'approve' | 'reject'>('approve');
  const [requestMessage, setRequestMessage] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestVerification = async () => {
    setLoading(true);
    try {
      if (onRequestVerification) {
        await onRequestVerification();
      }
      setShowRequestModal(false);
      setRequestMessage('');
    } catch (error) {
      console.error('Failed to request verification:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAction = async () => {
    setLoading(true);
    try {
      if (adminAction === 'approve' && onApprove) {
        await onApprove(adminNote);
      } else if (adminAction === 'reject' && onReject) {
        await onReject(adminNote);
      }
      setShowAdminModal(false);
      setAdminNote('');
    } catch (error) {
      console.error('Failed to process verification:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (isVerified) {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle className="mr-1 h-3 w-3" />
          Verified
        </Badge>
      );
    }

    if (verificationStatus === 'PENDING') {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
          <Clock className="mr-1 h-3 w-3" />
          Pending Verification
        </Badge>
      );
    }

    if (verificationStatus === 'REJECTED') {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <XCircle className="mr-1 h-3 w-3" />
          Verification Rejected
        </Badge>
      );
    }

    return (
      <Badge className="bg-white/10 text-white/70 border-white/20">
        <Shield className="mr-1 h-3 w-3" />
        Unverified
      </Badge>
    );
  };

  return (
    <>
      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Tournament Verification</CardTitle>
            {getStatusBadge()}
          </div>
          <CardDescription className="text-white/60">
            {isVerified
              ? 'This tournament has been verified by administrators'
              : 'Verified tournaments get official badge and enhanced visibility'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Details */}
          {verificationStatus && (
            <div className="space-y-2">
              {requestedAt && (
                <p className="text-sm text-white/70">
                  Requested: {new Date(requestedAt).toLocaleDateString()}
                </p>
              )}
              {reviewedAt && (
                <p className="text-sm text-white/70">
                  Reviewed: {new Date(reviewedAt).toLocaleDateString()}
                </p>
              )}
              {verificationNote && (
                <div className="rounded-lg bg-white/5 p-3">
                  <p className="text-sm text-white/80">{verificationNote}</p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {/* Organizer Actions */}
            {isOrganizer && !isVerified && verificationStatus !== 'PENDING' && (
              <Button
                onClick={() => setShowRequestModal(true)}
                className="gap-2 bg-cyan-500 text-black hover:bg-cyan-400"
              >
                <Shield className="h-4 w-4" />
                Request Verification
              </Button>
            )}

            {/* Admin Actions */}
            {isAdmin && verificationStatus === 'PENDING' && (
              <>
                <Button
                  onClick={() => {
                    setAdminAction('approve');
                    setShowAdminModal(true);
                  }}
                  className="gap-2 bg-green-500 text-white hover:bg-green-600"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </Button>
                <Button
                  onClick={() => {
                    setAdminAction('reject');
                    setShowAdminModal(true);
                  }}
                  variant="outline"
                  className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Request Verification Modal */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Tournament Verification</DialogTitle>
            <DialogDescription>
              Provide additional information to help administrators verify your
              tournament
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                Message to Administrators
              </label>
              <Textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="Share tournament details, organizer credentials, or any information that helps verify legitimacy..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRequestModal(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestVerification}
              disabled={loading}
              className="bg-cyan-500 text-black hover:bg-cyan-400"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Review Modal */}
      <Dialog open={showAdminModal} onOpenChange={setShowAdminModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adminAction === 'approve' ? 'Approve' : 'Reject'} Verification
            </DialogTitle>
            <DialogDescription>
              {adminAction === 'approve'
                ? 'This tournament will receive a verified badge'
                : 'Provide a reason for rejection'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                {adminAction === 'approve' ? 'Approval Note' : 'Rejection Reason'}
              </label>
              <Textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={
                  adminAction === 'approve'
                    ? 'Optional note for the organizers...'
                    : 'Explain why the verification was rejected...'
                }
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAdminModal(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdminAction}
              disabled={loading}
              className={
                adminAction === 'approve'
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {adminAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

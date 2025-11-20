'use client';

import { DeviceSettings, useCall, VideoPreview } from '@stream-io/video-react-sdk'
import React, { useEffect, useState } from 'react'
import { Button } from './ui/button';
import { useUser } from '@clerk/nextjs';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const StandaloneMeetingSetup = ({ 
  setIsSetupComplete,
  meetingTitle,
  userInvitedRole
}: { 
  setIsSetupComplete: (value: boolean) => void;
  meetingTitle?: string;
  userInvitedRole?: string;
}) => {
  const [isMicCamToggledOn, setIsMicCamToggledOn] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'judge' | 'debater' | 'spectator'>('spectator');
  const { user } = useUser();
  const call = useCall();

  if(!call) {
    throw new Error("useCall must be used within a StreamCall component")
  }

  // Set default role based on invitation
  useEffect(() => {
    if (userInvitedRole) {
      const roleMap: { [key: string]: 'judge' | 'debater' | 'spectator' } = {
        'JUDGE': 'judge',
        'DEBATER': 'debater',
        'CREATOR': 'judge'
      };
      setSelectedRole(roleMap[userInvitedRole] || 'spectator');
    }
  }, [userInvitedRole]);

  useEffect(() => {
    if (!call) return;

    if (isMicCamToggledOn) {
      call.camera.disable();
      call.microphone.disable();
    } else {
      call.camera.enable();
      call.microphone.enable();
    }
  }, [isMicCamToggledOn, call]);

  return (
    <div className='flex h-screen w-full flex-col items-center justify-center gap-4 text-white bg-dark-1'>
      <div className='text-center mb-2'>
        <h1 className='text-3xl font-bold'>Join Meeting</h1>
        {meetingTitle && (
          <p className='text-lg text-white/70 mt-2'>{meetingTitle}</p>
        )}
      </div>

      {userInvitedRole && (
        <div className='bg-blue-600/20 border border-blue-500/30 px-4 py-2 rounded-lg text-center'>
          <p className='text-sm font-medium'>Invited as: <span className='text-cyan-400'>{userInvitedRole}</span></p>
        </div>
      )}

      <div className='w-full max-w-2xl'>
        <VideoPreview />
      </div>

      <div className='flex flex-col items-center gap-4 w-full max-w-md px-4'>
        <div className='w-full bg-dark-2 p-4 rounded-lg border border-white/10'>
          <Label htmlFor="role-select" className='text-white mb-2 block text-base font-semibold'>
            Select Your Role
          </Label>
          <Select value={selectedRole} onValueChange={(value: 'judge' | 'debater' | 'spectator') => setSelectedRole(value)}>
            <SelectTrigger id="role-select" className='w-full bg-dark-3 text-white border-white/10 h-11'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="debater">
                <div className='py-1'>
                  <div className='font-semibold'>Debater</div>
                  <div className='text-xs text-muted-foreground'>Full audio/video, can speak</div>
                </div>
              </SelectItem>
              <SelectItem value="judge">
                <div className='py-1'>
                  <div className='font-semibold'>Judge</div>
                  <div className='text-xs text-muted-foreground'>Full audio/video, can moderate</div>
                </div>
              </SelectItem>
              <SelectItem value="spectator">
                <div className='py-1'>
                  <div className='font-semibold'>Spectator</div>
                  <div className='text-xs text-muted-foreground'>View-only mode</div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className='text-xs text-white/60 mt-2'>
            {selectedRole === 'debater' && '✓ You can actively participate in the debate with full speaking rights'}
            {selectedRole === 'judge' && '✓ You can moderate, evaluate, and provide feedback'}
            {selectedRole === 'spectator' && '✓ You can watch the debate without speaking permissions'}
          </p>
        </div>

        <div className='flex flex-col sm:flex-row items-center gap-3 w-full'>
          <label className='flex items-center justify-center gap-2 font-medium text-sm'>
            <input 
              type="checkbox"
              checked={isMicCamToggledOn}
              onChange={(e) => setIsMicCamToggledOn(e.target.checked)}
              className='w-4 h-4'
            />
            Join with mic and camera off
          </label>
          <DeviceSettings />
        </div>
      </div>

      <Button
        className="rounded-lg bg-green-600 hover:bg-green-700 px-8 py-3 text-base font-semibold mt-2"
        onClick={async () => {
          if (!user?.id) {
            console.error('Unable to join call without an authenticated user');
            return;
          }

          try {
            console.log('Setting Stream role:', selectedRole, 'for user:', user.id);
            
            // Update call members with the selected role
            await call.updateCallMembers({
              update_members: [
                {
                  user_id: user.id,
                  role: selectedRole,
                },
              ],
            });
            
            console.log('Stream role set successfully');
            
            await call.join();
            setIsSetupComplete(true);
          } catch (err) {
            console.error("Failed to join call:", err);
          }
        }}
      >
        Join Meeting
      </Button>
    </div>
  )
}

export default StandaloneMeetingSetup

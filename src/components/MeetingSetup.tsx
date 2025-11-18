'use client';

import { DeviceSettings, useCall, VideoPreview } from '@stream-io/video-react-sdk'
import React, { useEffect, useState } from 'react'
import { Button } from './ui/button';
import { useUser } from '@clerk/nextjs';

const MeetingSetup = ({ 
  setIsSetupComplete,
  userRole,
  streamRole
}: { 
  setIsSetupComplete: (value: boolean) => void;
  userRole?: string;
  streamRole?: 'judge' | 'debater' | 'spectator';
}) => {
  const [isMicCamToggledOn, setIsMicCamToggledOn] = useState(false);
  const { user } = useUser();
  const call = useCall();

  if(!call) {
    throw new Error("usecall must be used within a StreamCall component")
  }

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
    <div className='flex h-screen w-full flex-col items-center justify-center gap-3 text-white'>
      <h1 className='text-2xl font-bold'>Setup</h1>
      {userRole && (
        <div className='bg-blue-600 px-4 py-2 rounded-lg text-center'>
          <p className='text-sm font-medium'>Your Role: {userRole}</p>
          {streamRole && (
            <p className='text-xs mt-1 opacity-75'>Stream Role: {streamRole}</p>
          )}
        </div>
      )}
      <VideoPreview />
      <div className='flex h-16 items-center justify-center gap-3'>
        <label className='flex items-center justify-center gap-2 font-medium'>
          <input 
            type="checkbox"
            checked={isMicCamToggledOn}
            onChange={(e) => setIsMicCamToggledOn(e.target.checked)}
          />
          Join with mic or camera off
        </label>
        <DeviceSettings />
      </div>
      <Button
        className="rounded-md bg-green-500 px-4 py-2.5"
        onClick={async () => {
          if (!user?.id) {
            console.error('Unable to join call without an authenticated user');
            return;
          }

          try {
            // Determine the Stream role based on the speaker role
            const role = streamRole || 'debater'; // Default to debater
            
            console.log('Setting Stream role:', role, 'for user:', user.id);
            
            // Update call members with the correct role
            await call.updateCallMembers({
              update_members: [
                {
                  user_id: user.id,
                  role: role,
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

export default MeetingSetup

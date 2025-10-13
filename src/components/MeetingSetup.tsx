'use client';

import { DeviceSettings, useCall, VideoPreview, JoinCallData } from '@stream-io/video-react-sdk'
import React, { useEffect, useState } from 'react'
import { Button } from './ui/button';

const MeetingSetup = ({ setIsSetupComplete }: { setIsSetupComplete: (value: boolean) => void}) => {
  const [isMicCamToggledOn, setIsMicCamToggledOn] = useState(false);
  type Role = 'judge' | 'debater' | 'spectator';
  type JoinWithRole = JoinCallData & { role?: 'judge' | 'debater' | 'spectator' };
  const [selectedRole, setSelectedRole] = useState<Role>('spectator');

  const call = useCall();

  if(!call) {
    throw new Error("usecall must be used within a StreamCall component")
  }

  useEffect(() => {
  if (selectedRole === 'spectator') {
    call.camera.disable();
    call.microphone.disable();
    return;
  }

  if (isMicCamToggledOn) {
    call.camera.disable();
    call.microphone.disable();
  } else {
    call.camera.enable();
    call.microphone.enable();
  }
}, [isMicCamToggledOn, selectedRole, call?.camera, call?.microphone]);

  return (
    <div className='flex h-screen w-full flex-col items-center justify-center gap-3 text-white'>
      <h1 className='text-2xl font-bold'>Setup</h1>
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
      <div className='flex items-center justify-center gap-3'>
        <span className='mr-2 font-medium'>Role:</span>
        <div className='flex gap-2'>
          <button
            className={`rounded px-3 py-1 ${selectedRole === 'judge' ? 'bg-blue-600' : 'bg-gray-700'}`}
            onClick={() => setSelectedRole('judge')}
            type="button"
          >
            Judge
          </button>
          <button
            className={`rounded px-3 py-1 ${selectedRole === 'debater' ? 'bg-blue-600' : 'bg-gray-700'}`}
            onClick={() => setSelectedRole('debater')}
            type="button"
          >
            Debater
          </button>
          <button
            className={`rounded px-3 py-1 ${selectedRole === 'spectator' ? 'bg-blue-600' : 'bg-gray-700'}`}
            onClick={() => setSelectedRole('spectator')}
            type="button"
          >
            Spectator
          </button>
        </div>
      </div>
      <Button
        className="rounded-md bg-green-500 px-4 py-2.5"
        onClick={async () => {
          try {
            await call.join({ role: selectedRole } as JoinWithRole);
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

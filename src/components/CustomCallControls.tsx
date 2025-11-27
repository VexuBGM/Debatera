import { OwnCapability, Restricted } from '@stream-io/video-react-sdk';
import {
  ReactionsButton,
  ToggleAudioPublishingButton,
  ToggleVideoPublishingButton,
  CancelCallButton,
} from '@stream-io/video-react-sdk';
import { RoleChangeButton } from './RoleChangeButton';
import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

const GRANT_SEND_AUDIO: OwnCapability[] = [OwnCapability.SEND_AUDIO];
const GRANT_SEND_VIDEO: OwnCapability[] = [OwnCapability.SEND_VIDEO];
const GRANT_CREATE_REACTION: OwnCapability[] = [OwnCapability.CREATE_REACTION];

function Timer() {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartStop = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSeconds(0);
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg">
      <div className="text-white font-mono text-lg min-w-20 text-center">
        {formatTime(seconds)}
      </div>
      <button
        onClick={handleStartStop}
        className="p-2 rounded-full hover:bg-gray-700 transition-colors"
        title={isRunning ? 'Pause' : 'Start'}
      >
        {isRunning ? (
          <Pause className="w-5 h-5 text-white" />
        ) : (
          <Play className="w-5 h-5 text-white" />
        )}
      </button>
      <button
        onClick={handleReset}
        className="p-2 rounded-full hover:bg-gray-700 transition-colors"
        title="Reset"
      >
        <RotateCcw className="w-5 h-5 text-white" />
      </button>
    </div>
  );
}

export default function CustomCallControls({ 
  onLeave, 
  showRoleChange = false 
}: { 
  onLeave?: () => void;
  showRoleChange?: boolean;
}) {
  return (
    <div className="str-video__call-controls">
      <Restricted requiredGrants={GRANT_SEND_AUDIO}>
        <ToggleAudioPublishingButton
          Menu={() => null}
          menuPlacement="bottom"
          onMenuToggle={() => {}}
        />
      </Restricted>
      <Restricted requiredGrants={GRANT_SEND_VIDEO}>
        <ToggleVideoPublishingButton
          Menu={() => null}
          menuPlacement="bottom"
          onMenuToggle={() => {}}
        />
      </Restricted>
      <Restricted requiredGrants={GRANT_CREATE_REACTION}>
        <ReactionsButton />
      </Restricted>
      <Timer />
      {showRoleChange && <RoleChangeButton />}
      <CancelCallButton onLeave={onLeave} />
    </div>

    /* Todo: Add EndCallForEveryoneButton that only people with the role of judge(from stream sdk) can access, remove the option to change mic or camera if you don't have the permission, if you don't have the permission the buttons to have a different color */
  );
}

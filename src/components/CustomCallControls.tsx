"use client"

import React from 'react'
import { OwnCapability } from '@stream-io/video-client'
import { Restricted } from '@stream-io/video-react-bindings'
import {
  ReactionsButton,
  ToggleAudioPublishingButton,
  ToggleVideoPublishingButton,
  CancelCallButton,
} from '@stream-io/video-react-sdk'

// A drop-in replacement for the SDK's CallControls that does NOT show the
// SpeakingWhileMutedNotification wrapper. Use this when you want to avoid the
// "You are muted. Unmute to speak" popup but keep the same control buttons.
const CustomCallControls = ({ onLeave }: { onLeave?: () => void }) => {
  return (
    <div className="str-video__call-controls">
      <Restricted requiredGrants={[OwnCapability.SEND_AUDIO]}>
        <ToggleAudioPublishingButton />
      </Restricted>

      <Restricted requiredGrants={[OwnCapability.SEND_VIDEO]}>
        <ToggleVideoPublishingButton />
      </Restricted>

      <Restricted requiredGrants={[OwnCapability.CREATE_REACTION]}>
        <ReactionsButton />
      </Restricted>

      <CancelCallButton onLeave={onLeave} />
    </div>
  )
}

export default CustomCallControls

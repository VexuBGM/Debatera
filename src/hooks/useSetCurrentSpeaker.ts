"use client"

import { useCall } from "@stream-io/video-react-sdk"

export function useSetCurrentSpeaker() {
  const call = useCall()

  return async (userId: string | null) => {
    if (!call) return

    const currentCustom = (call.state.custom || {}) as Record<string, any>

    await call.update({
      custom: {
        ...currentCustom,
        currentSpeakerUserId: userId || undefined, // null/undefined clears it
      },
    })
  }
}

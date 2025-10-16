'use client'

import React, { useState } from 'react'
import { Button } from './ui/button'
import { useUser } from '@clerk/nextjs'
import { useStreamVideoClient, Call } from '@stream-io/video-react-sdk'
import { useRouter } from 'next/navigation'

const CreateMeetingButton = () => {
  const router = useRouter()
  const { user } = useUser()
  const client = useStreamVideoClient()
  const [values, setValues] = useState({
    dateTime: new Date(),
    description: '',
  })
  const [callDetails, setCallDetails] = useState<Call>()

  const createMeeting = async () => {
    if (!client || !user) return ;

    try {
      const id = crypto.randomUUID();
      const call = client.call('default', id);

      if (!call) throw new Error('Call creation failed');

      const startsAt = values.dateTime.toISOString() || new Date(Date.now()).toISOString();
      const description = values.description || 'No description provided';

      await call.getOrCreate({
        data: {
          starts_at: startsAt,
          custom: {
            description
          }
        }
      })

      setCallDetails(call);

      if(!values.description) {
        router.push(`/debate/${call.id}`);
      }
    } catch (error) {
      console.error("Error creating meeting:", error);
    }
  }


  return (
    <div>
      <Button 
        variant="secondary"
        onClick={createMeeting} 
        className="rounded-lg bg-white/10 text-white/80 hover:bg-white/15 cursor-pointer"
      >
        Start Debate
      </Button>
    </div>
  )
}

export default CreateMeetingButton

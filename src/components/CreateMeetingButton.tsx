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
    link: '',
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
      <Button onClick={createMeeting} className="mt-10 ml-10 bg-cyan-600 hover:bg-cyan-700 text-white cursor-pointer">
        Create Meeting
      </Button>
    </div>
  )
}

export default CreateMeetingButton

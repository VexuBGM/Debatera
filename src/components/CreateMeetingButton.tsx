'use client'

import React, { useState } from 'react'
import { Button } from './ui/button'
import { useUser } from '@clerk/nextjs'
import { useStreamVideoClient } from '@stream-io/video-react-sdk'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Plus, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { logger } from '@/lib/logger'

interface Invite {
  email: string;
  role: 'DEBATER' | 'JUDGE';
}

const CreateMeetingButton = () => {
  const router = useRouter()
  const { user } = useUser()
  const client = useStreamVideoClient()
  const [open, setOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [invites, setInvites] = useState<Invite[]>([{ email: '', role: 'DEBATER' }])

  const addInvite = () => {
    setInvites([...invites, { email: '', role: 'DEBATER' }])
  }

  const removeInvite = (index: number) => {
    setInvites(invites.filter((_, i) => i !== index))
  }

  const updateInvite = (index: number, field: 'email' | 'role', value: string) => {
    const newInvites = [...invites]
    newInvites[index][field] = value as any
    setInvites(newInvites)
  }

  const createMeeting = async () => {
    if (!client || !user) return

    // Validation
    if (!title.trim()) {
      toast.error('Please enter a meeting title')
      return
    }

    const validInvites = invites.filter(inv => inv.email.trim())
    if (validInvites.length === 0) {
      toast.error('Please add at least one participant')
      return
    }

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    for (const invite of validInvites) {
      if (!emailRegex.test(invite.email)) {
        toast.error(`Invalid email: ${invite.email}`)
        return
      }
    }

    setIsCreating(true)

    try {
      // Create Stream video call
      const callId = crypto.randomUUID()
      const call = client.call('default', callId)

      if (!call) throw new Error('Call creation failed')

      const startsAt = new Date().toISOString()

      await call.getOrCreate({
        data: {
          starts_at: startsAt,
          custom: {
            description: description || title
          }
        }
      })

      // Create meeting in database with invitations
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          callId,
          invites: validInvites,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create meeting')
      }

      toast.success('Meeting created! Invitations sent.')
      setOpen(false)
      
      // Reset form
      setTitle('')
      setDescription('')
      setInvites([{ email: '', role: 'DEBATER' }])

      // Optionally navigate to the meeting
      router.push(`/debate/meeting/${data.meeting.id}`)
    } catch (error: any) {
      logger.error('Error creating meeting', error);
      toast.error(error.message || 'Failed to create meeting')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="secondary"
          className="rounded-lg bg-white/10 text-white/80 hover:bg-white/15 cursor-pointer"
        >
          Start Debate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Debate Meeting</DialogTitle>
          <DialogDescription>
            Create a private debate meeting and invite participants by email
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Meeting Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Practice Debate Session"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add details about the meeting..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Participants *</Label>
            <div className="space-y-2">
              {invites.map((invite, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Email address"
                    value={invite.email}
                    onChange={(e) => updateInvite(index, 'email', e.target.value)}
                    className="flex-1"
                  />
                  <Select
                    value={invite.role}
                    onValueChange={(value) => updateInvite(index, 'role', value)}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEBATER">Debater</SelectItem>
                      <SelectItem value="JUDGE">Judge</SelectItem>
                    </SelectContent>
                  </Select>
                  {invites.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeInvite(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addInvite}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Participant
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button onClick={createMeeting} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Meeting'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateMeetingButton

import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient' // relative path is correct

interface FeedbackMessage {
  id: string;
  message: string;
  submission_id: string;
  created_at: string;
}

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: FeedbackMessage;
  old: FeedbackMessage;
}

// Type assertion for the channel.on method
type ChannelOnMethod = {
  on: (
    event: 'postgres_changes',
    filter: {
      event: string;
      schema: string;
      table: string;
      filter?: string;
    },
    callback: (payload: RealtimePayload) => void
  ) => {
    subscribe: (callback?: (status: unknown) => void) => void;
  };
};

export default function RealtimeTest() {
  const [messages, setMessages] = useState<FeedbackMessage[]>([])

  useEffect(() => {
    // Initial fetch
    const fetchData = async () => {
      const { data, error } = await supabase.from('feedback').select('*')
      if (error) console.error(error)
      if (data) setMessages(data as FeedbackMessage[])
    }

    fetchData()

    // Realtime subscription
    const subscription = (supabase
      .channel('realtime-feedback') as unknown as ChannelOnMethod)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback',
        },
        (payload: RealtimePayload) => {
          console.log('Change received!', payload)
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, payload.new])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription as any)
    }
  }, [])

  return (
    <div>
      <h1>Live Feedback</h1>
      {messages.map((msg) => (
        <div key={msg.id}>{msg.message}</div>
      ))}
    </div>
  )
}

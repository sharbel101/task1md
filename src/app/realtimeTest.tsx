import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient' // relative path is correct

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, unknown>
  old: Record<string, unknown>
}

export default function RealtimeTest() {
  const [messages, setMessages] = useState<any[]>([])

  useEffect(() => {
    // Initial fetch
    const fetchData = async () => {
      const { data, error } = await supabase.from('feedback').select('*')
      if (error) console.error(error)
      if (data) setMessages(data)
    }

    fetchData()

    // Realtime subscription
    const subscription = supabase
      .channel('realtime-feedback')
      .on(
        'postgres_changes' as any,
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
      supabase.removeChannel(subscription)
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

import { useState, useRef, useEffect } from 'react'
import { Send, BrainCircuit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'signal'
  text: string
  timestamp: Date
}

const cannedResponses: Record<string, string> = {
  position: 'Current net position across all elevators: 307,000 bu long. Largest coverage gap at Atlantic Main — 130,000 bu corn, December delivery. Coverage at 83% of target. Recommend focusing origination efforts on southwest territory where competitor spread is most favorable.',
  basis: 'Regional corn basis averaging 14 under December. ML recommendation: tighten to 12 under at Ames Main based on competitor pullback and crop stress signals. Soybean basis at 31 under November — within 3 cents of competitor. Spread advantage strongest at Atlantic Main.',
  leads: 'Dispatch queue shows 8 active leads this week. Highest priority: Bob Schroeder (94 score) — large operation, 2,400 acres, corn. Was waiting on USDA report which released Tuesday. Recommend calling today. Second priority: Gary Novak (89 score) — drought stress on northeast fields, motivated seller.',
  competitor: 'Atlantic Foods pulled back corn bids 3 cents yesterday — elevator at 87% capacity in southeast zone. This creates origination opportunity in the overlap area between Ames Main and Nevada Terminal coverage zones. No other significant competitor moves in the last 48 hours.',
  stress: 'Satellite imagery shows elevated NDVI stress index in Johnson and Polk counties. Stress pattern consistent with moisture deficit in corn. Early harvest likely in affected areas. Farmers in stress zone may be more motivated sellers — 3 leads in queue are in affected area.',
}

function getResponse(input: string): string {
  const lower = input.toLowerCase()
  if (lower.includes('position') || lower.includes('coverage') || lower.includes('gap')) {
    return cannedResponses.position
  }
  if (lower.includes('basis') || lower.includes('price') || lower.includes('bid')) {
    return cannedResponses.basis
  }
  if (lower.includes('lead') || lower.includes('queue') || lower.includes('farmer') || lower.includes('call')) {
    return cannedResponses.leads
  }
  if (lower.includes('competitor') || lower.includes('atlantic') || lower.includes('compete')) {
    return cannedResponses.competitor
  }
  if (lower.includes('stress') || lower.includes('crop') || lower.includes('weather') || lower.includes('ndvi')) {
    return cannedResponses.stress
  }
  return 'Analysis available for: position and coverage gaps, basis recommendations, dispatch queue priorities, competitor activity, and crop stress signals. What area would be most useful to explore?'
}

export function SignalChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'signal',
      text: 'Kernel Signal — findings from position data, ML recommendations, and market intelligence. Ask about position, basis, leads, competitors, or crop stress.',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    // Simulate response delay
    setTimeout(() => {
      const response = getResponse(userMsg.text)
      const signalMsg: Message = {
        id: `signal-${Date.now()}`,
        role: 'signal',
        text: response,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, signalMsg])
      setIsTyping(false)
    }, 800 + Math.random() * 600)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]" data-testid="signal-chat">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border p-4">
        <BrainCircuit className="h-5 w-5 text-violet-400" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
          Kernel Signal
        </h2>
        <span className="font-mono text-[10px] font-medium text-violet-400">
          v0.1 · stub
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={cn(
              'max-w-2xl',
              msg.role === 'user' ? 'ml-auto' : ''
            )}
          >
            {msg.role === 'signal' && (
              <span className="text-[10px] font-medium uppercase tracking-wider text-violet-400 block mb-1">
                Signal
              </span>
            )}
            <div
              className={cn(
                'rounded-md p-3',
                msg.role === 'signal'
                  ? 'bg-violet-900/10 border border-violet-700/20'
                  : 'bg-secondary border border-border'
              )}
            >
              <p className="text-sm text-zinc-200 whitespace-pre-wrap">
                {msg.text}
              </p>
            </div>
            <span className="font-mono text-[9px] font-medium text-zinc-700 mt-1 block">
              {msg.timestamp.toLocaleTimeString()}
            </span>
          </div>
        ))}
        {isTyping && (
          <div className="max-w-2xl">
            <span className="text-[10px] font-medium uppercase tracking-wider text-violet-400 block mb-1">
              Signal
            </span>
            <div className="rounded-md p-3 bg-violet-900/10 border border-violet-700/20">
              <span className="text-sm text-zinc-500 animate-pulse-slow">
                Analyzing...
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask about position, basis, leads, competitors..."
            className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-600 focus:outline-none"
            data-testid="signal-input"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="bg-violet-500 hover:bg-violet-400"
            data-testid="signal-send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

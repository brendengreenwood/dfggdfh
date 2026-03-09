import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { PersonaType } from '@/types/kernel'

interface PersonaBadgeProps {
  persona: PersonaType
  className?: string
}

const personaConfig: Record<PersonaType, { label: string; color: string }> = {
  MERCHANT: { label: 'Merchant', color: 'text-sky-400 border-sky-400/30' },
  GOM: { label: 'GOM', color: 'text-amber-400 border-amber-400/30' },
  CSR: { label: 'CSR', color: '' },
  STRATEGIC: { label: 'Strategic', color: '' },
  MANAGER: { label: 'Manager', color: '' },
  HYBRID: { label: 'Hybrid', color: 'text-violet-400 border-violet-400/30' },
}

export function PersonaBadge({ persona, className }: PersonaBadgeProps) {
  const config = personaConfig[persona]

  return (
    <Badge variant="outline" className={cn(config.color, className)} data-testid="persona-badge">
      {config.label}
    </Badge>
  )
}

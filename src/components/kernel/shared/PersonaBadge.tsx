import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { PersonaType } from '@/types/kernel'

interface PersonaBadgeProps {
  persona: PersonaType
  className?: string
}

const personaConfig: Record<PersonaType, { label: string; variant: 'sky' | 'amber' | 'default' | 'secondary' | 'violet' }> = {
  MERCHANT: { label: 'Merchant', variant: 'sky' },
  GOM: { label: 'GOM', variant: 'amber' },
  CSR: { label: 'CSR', variant: 'secondary' },
  STRATEGIC: { label: 'Strategic', variant: 'secondary' },
  MANAGER: { label: 'Manager', variant: 'secondary' },
  HYBRID: { label: 'Hybrid', variant: 'default' },
}

export function PersonaBadge({ persona, className }: PersonaBadgeProps) {
  const config = personaConfig[persona]

  return (
    <Badge variant={config.variant} className={cn(className)} data-testid="persona-badge">
      {config.label}
    </Badge>
  )
}

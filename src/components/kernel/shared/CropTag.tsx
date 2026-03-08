import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { CropType } from '@/types/kernel'

interface CropTagProps {
  crop: CropType
  className?: string
}

const cropLabels: Record<CropType, string> = {
  CORN: 'Corn',
  SOYBEANS: 'Soybeans',
  WHEAT: 'Wheat',
  SORGHUM: 'Sorghum',
  OATS: 'Oats',
}

export function CropTag({ crop, className }: CropTagProps) {
  return (
    <Badge variant="outline" className={cn(className)} data-testid="crop-tag">
      {cropLabels[crop]}
    </Badge>
  )
}

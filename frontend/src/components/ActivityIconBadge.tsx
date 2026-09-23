import { Globe } from 'lucide-react'
import { ACTIVITY_ICONS } from '../utils/activityIcons'

export function ActivityIcon({ name, size = 22 }: { name: string; size?: number }) {
  const Icon = ACTIVITY_ICONS[name] || Globe
  return <Icon size={size} strokeWidth={1.8} />
}

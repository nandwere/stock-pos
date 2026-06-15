import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const CONFIG: Record<string, string> = {
  OPERATIONAL: 'bg-blue-50 text-blue-700',
  CAPITAL:     'bg-purple-50 text-purple-700',
  RECURRING:   'bg-orange-50 text-orange-700',
  ONE_TIME:    'bg-gray-50 text-gray-600',
};

export function ExpenseTypeBadge({ type }: { type: string }) {
  return (
    <Badge className={cn('text-xs font-medium border-0', CONFIG[type] ?? 'bg-gray-50 text-gray-600')}>
      {type.replace('_', ' ')}
    </Badge>
  );
}
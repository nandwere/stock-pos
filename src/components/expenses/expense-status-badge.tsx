import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT:     { label: 'Draft',     className: 'bg-gray-100 text-gray-600'    },
  SUBMITTED: { label: 'Submitted', className: 'bg-blue-100 text-blue-700'    },
  APPROVED:  { label: 'Approved',  className: 'bg-teal-100 text-teal-700'    },
  REJECTED:  { label: 'Rejected',  className: 'bg-red-100 text-red-600'      },
  PAID:      { label: 'Paid',      className: 'bg-green-100 text-green-700'  },
  VOIDED:    { label: 'Voided',    className: 'bg-gray-100 text-gray-400'    },
};

export function ExpenseStatusBadge({ status }: { status: string }) {
  const cfg = CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' };
  return (
    <Badge className={cn('text-xs font-semibold border-0', cfg.className)}>
      {cfg.label}
    </Badge>
  );
}
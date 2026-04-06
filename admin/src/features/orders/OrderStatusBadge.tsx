import { Badge } from '@mantine/core';
import type { AdminOrder } from '../../types';

const STATUS_MAP: Record<AdminOrder['status'], { label: string; color: string }> = {
  pending:    { label: 'Очікує',     color: 'yellow' },
  processing: { label: 'В обробці',  color: 'blue'   },
  delivered:  { label: 'Доставлено', color: 'green'  },
  cancelled:  { label: 'Скасовано',  color: 'red'    },
};

export function OrderStatusBadge({ status }: { status: AdminOrder['status'] }) {
  const { label, color } = STATUS_MAP[status];
  return <Badge color={color}>{label}</Badge>;
}

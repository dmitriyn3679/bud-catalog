import { Badge } from '@mantine/core';
import { Order } from '../../types';

const STATUS_MAP: Record<Order['status'], { label: string; color: string }> = {
  pending:    { label: 'Очікує',     color: 'yellow' },
  processing: { label: 'В обробці',  color: 'blue'   },
  delivered:  { label: 'Доставлено', color: 'green'  },
  cancelled:  { label: 'Скасовано',  color: 'red'    },
};

export function OrderStatusBadge({ status }: { status: Order['status'] }) {
  const { label, color } = STATUS_MAP[status] ?? { label: status, color: 'gray' };
  return <Badge color={color}>{label}</Badge>;
}

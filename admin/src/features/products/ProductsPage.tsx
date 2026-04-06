import {
  ActionIcon,
  Badge,
  Button,
  Center,
  Group,
  Pagination,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminProducts, useDeleteProduct } from './useProducts';

function markup(price: number, purchasePrice: number) {
  if (!purchasePrice) return '—';
  return `${(((price - purchasePrice) / purchasePrice) * 100).toFixed(1)}%`;
}

export function ProductsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 400);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAdminProducts(debouncedSearch || undefined, page);
  const deleteProduct = useDeleteProduct();

  const handleDelete = (id: string, title: string) => {
    modals.openConfirmModal({
      title: 'Видалити товар?',
      children: <Text size="sm">«{title}» буде видалено разом з усіма зображеннями.</Text>,
      labels: { confirm: 'Видалити', cancel: 'Скасувати' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteProduct.mutateAsync(id);
          notifications.show({ color: 'green', message: 'Товар видалено' });
        } catch {
          notifications.show({ color: 'red', message: 'Помилка видалення' });
        }
      },
    });
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Товари</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/admin/products/new')}>
          Додати товар
        </Button>
      </Group>

      <TextInput
        w={320}
        placeholder="Пошук..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
      />

      <Table highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Назва</Table.Th>
            <Table.Th>Ціна клієнта</Table.Th>
            <Table.Th>Закупівельна</Table.Th>
            <Table.Th>Націнка</Table.Th>
            <Table.Th>Склад</Table.Th>
            <Table.Th>Статус</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {isLoading ? (
            <Table.Tr><Table.Td colSpan={7}><Center py="xl"><Text c="dimmed">Завантаження...</Text></Center></Table.Td></Table.Tr>
          ) : !data?.items.length ? (
            <Table.Tr><Table.Td colSpan={7}><Center py="xl"><Text c="dimmed">Товарів не знайдено</Text></Center></Table.Td></Table.Tr>
          ) : (
            data.items.map((p) => (
              <Table.Tr key={p._id}>
                <Table.Td maw={240}>
                  <Text lineClamp={1} fw={500}>{p.title}</Text>
                  <Text size="xs" c="dimmed">{p.brandId.name}</Text>
                </Table.Td>
                <Table.Td>{p.price.toLocaleString('uk-UA')} ₴</Table.Td>
                <Table.Td>{p.purchasePrice.toLocaleString('uk-UA')} ₴</Table.Td>
                <Table.Td fw={500} c={p.price > p.purchasePrice ? 'green' : 'red'}>
                  {markup(p.price, p.purchasePrice)}
                </Table.Td>
                <Table.Td>{p.stock}</Table.Td>
                <Table.Td>
                  <Badge color={p.isActive ? 'green' : 'gray'} variant="light">
                    {p.isActive ? 'Активний' : 'Прихований'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" wrap="nowrap">
                    <ActionIcon variant="subtle" onClick={() => navigate(`/admin/products/${p._id}/edit`)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(p._id, p.title)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>

      {(data?.totalPages ?? 0) > 1 && (
        <Pagination total={data!.totalPages} value={page} onChange={setPage} />
      )}
    </Stack>
  );
}

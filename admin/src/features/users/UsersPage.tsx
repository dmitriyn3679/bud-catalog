import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconArrowDown, IconArrowsSort, IconArrowUp, IconEdit, IconLock, IconLockOpen, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState, useMemo } from 'react';
import type { AdminUser, Category } from '../../types';
import { useAdminUsers, useDeleteCategoryMarkup, useDeleteGlobalMarkup, useToggleBlock, useUpsertCategoryMarkup, useUpsertGlobalMarkup, useUserMarkups } from './useUsers';
import { useAdminCategories } from '../categories/useCategories';

function flattenCategories(tree: Category[]): { value: string; label: string }[] {
  const result: { value: string; label: string }[] = [];
  for (const cat of tree) {
    result.push({ value: cat._id, label: cat.name });
    for (const child of cat.children ?? []) {
      result.push({ value: child._id, label: `  ↳ ${child.name}` });
    }
  }
  return result;
}

function UserModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const { data: markups = [] } = useUserMarkups(user._id);
  const { data: categoryTree = [] } = useAdminCategories();
  const upsertGlobal = useUpsertGlobalMarkup(user._id);
  const deleteGlobal = useDeleteGlobalMarkup(user._id);
  const upsertCategory = useUpsertCategoryMarkup(user._id);
  const deleteCategory = useDeleteCategoryMarkup(user._id);

  const [globalVal, setGlobalVal] = useState<number | string>(user.globalMarkupPercent ?? '');
  const [newCatId, setNewCatId] = useState<string | null>(null);
  const [newCatMarkup, setNewCatMarkup] = useState<number | string>('');

  const categoryOptions = flattenCategories(categoryTree).filter(
    (opt) => !markups.some((m) => m.categoryId._id === opt.value),
  );

  const handleSaveGlobal = async () => {
    if (globalVal === '' || Number(globalVal) < 0) return;
    try {
      await upsertGlobal.mutateAsync(Number(globalVal));
      notifications.show({ color: 'green', message: 'Загальну націнку збережено' });
    } catch {
      notifications.show({ color: 'red', message: 'Помилка збереження' });
    }
  };

  const handleClearGlobal = async () => {
    try {
      await deleteGlobal.mutateAsync();
      setGlobalVal('');
      notifications.show({ color: 'green', message: 'Загальну націнку прибрано' });
    } catch {
      notifications.show({ color: 'red', message: 'Помилка видалення' });
    }
  };

  const handleAddCategory = async () => {
    if (!newCatId || newCatMarkup === '' || Number(newCatMarkup) < 0) return;
    try {
      await upsertCategory.mutateAsync({ categoryId: newCatId, markupPercent: Number(newCatMarkup) });
      setNewCatId(null);
      setNewCatMarkup('');
      notifications.show({ color: 'green', message: 'Націнку додано' });
    } catch {
      notifications.show({ color: 'red', message: 'Помилка збереження' });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteCategory.mutateAsync(categoryId);
      notifications.show({ color: 'green', message: 'Націнку видалено' });
    } catch {
      notifications.show({ color: 'red', message: 'Помилка видалення' });
    }
  };

  return (
    <Stack>
      <div>
        <Text fw={600}>{user.name}</Text>
        <Text size="sm" c="dimmed">
          {[user.email, user.phone].filter(Boolean).join(' · ')} · {user.shopName}
        </Text>
      </div>

      <Stack gap={4}>
        <Text fw={500} size="sm">Загальна націнка (на всі товари)</Text>
        <Group>
          <NumberInput
            placeholder="наприклад 25"
            suffix=" %"
            min={0}
            value={globalVal}
            onChange={setGlobalVal}
            w={160}
          />
          <Button size="sm" loading={upsertGlobal.isPending} onClick={handleSaveGlobal}>
            Зберегти
          </Button>
          {user.globalMarkupPercent != null && (
            <Button
              size="sm"
              variant="subtle"
              color="red"
              loading={deleteGlobal.isPending}
              onClick={handleClearGlobal}
            >
              Прибрати
            </Button>
          )}
        </Group>
      </Stack>

      <Stack gap={4}>
        <Text fw={500} size="sm">Націнки по категоріях</Text>

        {markups.length > 0 && (
          <Table withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Категорія</Table.Th>
                <Table.Th>Націнка</Table.Th>
                <Table.Th w={40} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {markups.map((m) => (
                <Table.Tr key={m._id}>
                  <Table.Td>{m.categoryId.name}</Table.Td>
                  <Table.Td>
                    <Badge variant="light">{m.markupPercent} %</Badge>
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      loading={deleteCategory.isPending}
                      onClick={() => handleDeleteCategory(m.categoryId._id)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}

        <Group align="flex-end">
          <Select
            placeholder="Оберіть категорію"
            data={categoryOptions}
            value={newCatId}
            onChange={setNewCatId}
            searchable
            w={200}
          />
          <NumberInput
            placeholder="%"
            suffix=" %"
            min={0}
            value={newCatMarkup}
            onChange={setNewCatMarkup}
            w={110}
          />
          <ActionIcon
            size="lg"
            loading={upsertCategory.isPending}
            onClick={handleAddCategory}
            disabled={!newCatId || newCatMarkup === ''}
          >
            <IconPlus size={16} />
          </ActionIcon>
        </Group>
      </Stack>

      <Group justify="flex-end" mt="sm">
        <Button variant="default" onClick={onClose}>Закрити</Button>
      </Group>
    </Stack>
  );
}

type SortKey = 'totalAmount' | 'avgMarkupPercent';
type SortDir = 'asc' | 'desc';

function SortIcon({ col, sort }: { col: SortKey; sort: { key: SortKey | null; dir: SortDir } }) {
  if (sort.key !== col) return <IconArrowsSort size={13} opacity={0.4} />;
  return sort.dir === 'asc' ? <IconArrowUp size={13} /> : <IconArrowDown size={13} />;
}

export function UsersPage() {
  const { data: users = [], isLoading } = useAdminUsers();
  const toggleBlock = useToggleBlock();
  const [blockingId, setBlockingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [sort, setSort] = useState<{ key: SortKey | null; dir: SortDir }>({ key: null, dir: 'desc' });
  const [blockedFilter, setBlockedFilter] = useState<'all' | 'blocked' | 'active'>('all');

  const handleSort = (key: SortKey) => {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' }
        : { key, dir: 'desc' },
    );
  };

  const filteredUsers = useMemo(() => {
    if (blockedFilter === 'blocked') return users.filter((u) => u.isBlocked);
    if (blockedFilter === 'active') return users.filter((u) => !u.isBlocked);
    return users;
  }, [users, blockedFilter]);

  const sortedUsers = useMemo(() => {
    if (!sort.key) return filteredUsers;
    return [...filteredUsers].sort((a, b) => {
      const aVal = sort.key === 'totalAmount'
        ? a.stats.totalAmount
        : (a.stats.avgMarkupPercent ?? -Infinity);
      const bVal = sort.key === 'totalAmount'
        ? b.stats.totalAmount
        : (b.stats.avgMarkupPercent ?? -Infinity);
      return sort.dir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [filteredUsers, sort]);

  const handleOpen = (user: AdminUser) => {
    setSelected(user);
    open();
  };

  const handleClose = () => {
    close();
    setSelected(null);
  };

  const thSort = (key: SortKey, label: string) => (
    <Table.Th
      ta="right"
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
      onClick={() => handleSort(key)}
    >
      <Group justify="flex-end" gap={4}>
        {label}
        <SortIcon col={key} sort={sort} />
      </Group>
    </Table.Th>
  );

  return (
    <>
      <Stack>
        <Group justify="space-between">
          <Title order={3}>Клієнти</Title>
          <SegmentedControl
            size="xs"
            value={blockedFilter}
            onChange={(v) => setBlockedFilter(v as typeof blockedFilter)}
            data={[
              { value: 'all', label: 'Всі' },
              { value: 'active', label: 'Активні' },
              { value: 'blocked', label: 'Заблоковані' },
            ]}
          />
        </Group>

        <Table highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Ім'я / Магазин</Table.Th>
              <Table.Th>Місто</Table.Th>
              <Table.Th>Email / Телефон</Table.Th>
              <Table.Th>Загальна націнка</Table.Th>
              <Table.Th ta="right">Замовлень</Table.Th>
              {thSort('totalAmount', 'Сума замовлень')}
              {thSort('avgMarkupPercent', 'Сер. націнка')}
              <Table.Th w={90} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              <Table.Tr>
                <Table.Td colSpan={8}><Text c="dimmed" ta="center" py="xl">Завантаження...</Text></Table.Td>
              </Table.Tr>
            ) : users.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={8}><Text c="dimmed" ta="center" py="xl">Клієнтів немає</Text></Table.Td>
              </Table.Tr>
            ) : sortedUsers.map((user) => (
              <Table.Tr
                key={user._id}
                bg={user.isBlocked ? 'var(--mantine-color-red-0)' : undefined}
              >
                <Table.Td>
                  <Group gap={6} wrap="nowrap">
                    <Text fw={500} size="sm">{user.name}</Text>
                    {user.isBlocked && <Badge color="red" variant="filled" size="xs">Заблокований</Badge>}
                  </Group>
                  <Text size="xs" c="dimmed">{user.shopName}</Text>
                </Table.Td>
                <Table.Td>{user.city}</Table.Td>
                <Table.Td>
                  {user.email && <Text size="sm">{user.email}</Text>}
                  {user.phone && <Text size="sm" c={user.email ? 'dimmed' : undefined}>{user.phone}</Text>}
                  {!user.email && !user.phone && <Text size="sm" c="dimmed">—</Text>}
                </Table.Td>
                <Table.Td>
                  {user.globalMarkupPercent != null ? (
                    <Badge variant="light" color="blue">{user.globalMarkupPercent} %</Badge>
                  ) : (
                    <Text size="xs" c="dimmed">—</Text>
                  )}
                </Table.Td>
                <Table.Td ta="right" fz="sm">{user.stats.orderCount}</Table.Td>
                <Table.Td ta="right" fz="sm" fw={500}>
                  {user.stats.totalAmount > 0
                    ? `${user.stats.totalAmount.toLocaleString('uk-UA')} ₴`
                    : <Text size="xs" c="dimmed">—</Text>}
                </Table.Td>
                <Table.Td ta="right">
                  {user.stats.avgMarkupPercent != null ? (
                    <Badge variant="light" color="teal">{user.stats.avgMarkupPercent} %</Badge>
                  ) : (
                    <Text size="xs" c="dimmed">—</Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Group gap={4} wrap="nowrap">
                    <Tooltip label={user.isBlocked ? 'Розблокувати' : 'Заблокувати'} withArrow>
                      <ActionIcon
                        variant="subtle"
                        color={user.isBlocked ? 'orange' : 'gray'}
                        loading={blockingId === user._id}
                        onClick={async () => {
                          setBlockingId(user._id);
                          try { await toggleBlock.mutateAsync(user._id); } finally { setBlockingId(null); }
                        }}
                      >
                        {user.isBlocked ? <IconLockOpen size={16} /> : <IconLock size={16} />}
                      </ActionIcon>
                    </Tooltip>
                    <ActionIcon variant="subtle" onClick={() => handleOpen(user)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>

      <Modal
        opened={opened}
        onClose={handleClose}
        title="Налаштування націнок"
        centered
        size="lg"
      >
        {selected && <UserModal user={selected} onClose={handleClose} />}
      </Modal>
    </>
  );
}

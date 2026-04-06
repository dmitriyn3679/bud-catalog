import {
  ActionIcon,
  Badge,
  Button,
  Drawer,
  Group,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import type { AdminUser, Category } from '../../types';
import { useAdminUsers, useDeleteCategoryMarkup, useUpsertCategoryMarkup, useUpsertGlobalMarkup, useUserMarkups } from './useUsers';
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

function UserDrawer({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const { data: markups = [] } = useUserMarkups(user._id);
  const { data: categoryTree = [] } = useAdminCategories();
  const upsertGlobal = useUpsertGlobalMarkup(user._id);
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
        <Text size="sm" c="dimmed">{user.email} · {user.shopName}</Text>
      </div>

      {/* Global markup */}
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
        </Group>
      </Stack>

      {/* Category markups */}
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

      <Button variant="default" onClick={onClose} mt="sm">Закрити</Button>
    </Stack>
  );
}

export function UsersPage() {
  const { data: users = [], isLoading } = useAdminUsers();
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  const handleOpen = (user: AdminUser) => {
    setSelected(user);
    open();
  };

  const handleClose = () => {
    close();
    setSelected(null);
  };

  return (
    <>
      <Stack>
        <Title order={3}>Клієнти</Title>

        <Table highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Ім'я / Магазин</Table.Th>
              <Table.Th>Місто</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Загальна націнка</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              <Table.Tr>
                <Table.Td colSpan={4}><Text c="dimmed" ta="center" py="xl">Завантаження...</Text></Table.Td>
              </Table.Tr>
            ) : users.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={4}><Text c="dimmed" ta="center" py="xl">Клієнтів немає</Text></Table.Td>
              </Table.Tr>
            ) : users.map((user) => (
              <Table.Tr
                key={user._id}
                style={{ cursor: 'pointer' }}
                onClick={() => handleOpen(user)}
              >
                <Table.Td>
                  <Text fw={500} size="sm">{user.name}</Text>
                  <Text size="xs" c="dimmed">{user.shopName}</Text>
                </Table.Td>
                <Table.Td>{user.city}</Table.Td>
                <Table.Td fz="sm">{user.email}</Table.Td>
                <Table.Td>
                  {user.globalMarkupPercent !== undefined && user.globalMarkupPercent !== null ? (
                    <Badge variant="light" color="blue">{user.globalMarkupPercent} %</Badge>
                  ) : (
                    <Text size="xs" c="dimmed">—</Text>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>

      <Drawer
        opened={opened}
        onClose={handleClose}
        title="Налаштування націнок"
        position="right"
        size="md"
        padding="lg"
      >
        {selected && <UserDrawer user={selected} onClose={handleClose} />}
      </Drawer>
    </>
  );
}

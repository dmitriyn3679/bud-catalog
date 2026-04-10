import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import type { Category } from '../../types';
import {
  useAdminCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from './useCategories';
import { usePageTitle } from '../../hooks/usePageTitle';

interface FormState {
  name: string;
  slug: string;
  parentId: string | null;
}

const EMPTY: FormState = { name: '', slug: '', parentId: null };

function toSlug(str: string) {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function CategoriesPage() {
  usePageTitle('Категорії');
  const { data: tree = [] } = useAdminCategories();
  const createMutation = useCreateCategory();
  const deleteMutation = useDeleteCategory();

  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  const updateMutation = useUpdateCategory(editing?._id ?? '');

  const rootOptions = tree.map((c) => ({ value: c._id, label: c.name }));

  useEffect(() => {
    if (editing) {
      setForm({ name: editing.name, slug: editing.slug, parentId: editing.parentId });
    } else {
      setForm(EMPTY);
    }
  }, [editing]);

  const handleOpen = (cat?: Category) => {
    setEditing(cat ?? null);
    open();
  };

  const handleClose = () => {
    setEditing(null);
    setForm(EMPTY);
    close();
  };

  const handleNameChange = (value: string) => {
    setForm((f) => ({
      ...f,
      name: value,
      slug: editing ? f.slug : toSlug(value),
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      notifications.show({ color: 'red', message: 'Назва та slug обов\'язкові' });
      return;
    }
    try {
      if (editing) {
        await updateMutation.mutateAsync(form);
        notifications.show({ color: 'green', message: 'Категорію оновлено' });
      } else {
        await createMutation.mutateAsync(form);
        notifications.show({ color: 'green', message: 'Категорію створено' });
      }
      handleClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notifications.show({ color: 'red', message: msg ?? 'Помилка' });
    }
  };

  const handleDelete = (cat: Category) => {
    modals.openConfirmModal({
      title: 'Видалити категорію?',
      children: <Text size="sm">«{cat.name}» буде видалено. Це неможливо скасувати.</Text>,
      labels: { confirm: 'Видалити', cancel: 'Скасувати' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(cat._id);
          notifications.show({ color: 'green', message: 'Категорію видалено' });
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          notifications.show({ color: 'red', message: msg ?? 'Помилка видалення' });
        }
      },
    });
  };

  const isBusy = createMutation.isPending || updateMutation.isPending;

  const flatRows: { cat: Category; isChild: boolean }[] = [];
  for (const root of tree) {
    flatRows.push({ cat: root, isChild: false });
    for (const child of root.children ?? []) {
      flatRows.push({ cat: child, isChild: true });
    }
  }

  return (
    <>
      <Stack>
        <Group justify="space-between">
          <Title order={3}>Категорії</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpen()}>
            Додати категорію
          </Button>
        </Group>

        <Table highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Назва</Table.Th>
              <Table.Th>Slug</Table.Th>
              <Table.Th>Рівень</Table.Th>
              <Table.Th w={80} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {flatRows.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text c="dimmed" ta="center" py="xl">Категорій немає</Text>
                </Table.Td>
              </Table.Tr>
            ) : flatRows.map(({ cat, isChild }) => (
              <Table.Tr key={cat._id}>
                <Table.Td>
                  <Text pl={isChild ? 24 : 0} fw={isChild ? 400 : 600}>
                    {isChild ? '↳ ' : ''}{cat.name}
                  </Text>
                </Table.Td>
                <Table.Td fz="sm" c="dimmed">{cat.slug}</Table.Td>
                <Table.Td>
                  <Badge variant="light" color={isChild ? 'gray' : 'blue'} size="sm">
                    {isChild ? 'Підкатегорія' : 'Категорія'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap={4} justify="flex-end">
                    <ActionIcon variant="subtle" onClick={() => handleOpen(cat)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(cat)}>
                      <IconTrash size={16} />
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
        title={editing ? 'Редагувати категорію' : 'Нова категорія'}
        centered
      >
        <Stack>
          <TextInput
            label="Назва"
            placeholder="Наприклад: Електроніка"
            value={form.name}
            onChange={(e) => handleNameChange(e.currentTarget.value)}
            required
          />
          <TextInput
            label="Slug"
            placeholder="elektronika"
            value={form.slug}
            onChange={(e) => { const v = e.currentTarget.value; setForm((f) => ({ ...f, slug: toSlug(v) })); }}
            description="Тільки латиниця, цифри та дефіс"
            required
          />
          <Select
            label="Батьківська категорія"
            placeholder="— Верхній рівень —"
            data={rootOptions}
            value={form.parentId}
            onChange={(v) => setForm((f) => ({ ...f, parentId: v }))}
            clearable
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={handleClose}>Скасувати</Button>
            <Button loading={isBusy} onClick={handleSubmit}>
              {editing ? 'Зберегти' : 'Створити'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

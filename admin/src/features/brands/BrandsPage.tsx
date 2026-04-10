import {
  ActionIcon,
  Button,
  Group,
  Modal,
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
import type { Brand } from '../../types';
import { useAdminBrands, useCreateBrand, useDeleteBrand, useUpdateBrand } from './useBrands';
import { usePageTitle } from '../../hooks/usePageTitle';

interface FormState {
  name: string;
  slug: string;
}

const EMPTY: FormState = { name: '', slug: '' };

function toSlug(str: string) {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function BrandsPage() {
  usePageTitle('Бренди');
  const { data: brands = [] } = useAdminBrands();
  const createMutation = useCreateBrand();
  const deleteMutation = useDeleteBrand();

  const [opened, { open, close }] = useDisclosure(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  const updateMutation = useUpdateBrand(editing?._id ?? '');

  useEffect(() => {
    if (editing) {
      setForm({ name: editing.name, slug: editing.slug });
    } else {
      setForm(EMPTY);
    }
  }, [editing]);

  const handleOpen = (brand?: Brand) => {
    setEditing(brand ?? null);
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
        notifications.show({ color: 'green', message: 'Бренд оновлено' });
      } else {
        await createMutation.mutateAsync(form);
        notifications.show({ color: 'green', message: 'Бренд створено' });
      }
      handleClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notifications.show({ color: 'red', message: msg ?? 'Помилка' });
    }
  };

  const handleDelete = (brand: Brand) => {
    modals.openConfirmModal({
      title: 'Видалити бренд?',
      children: <Text size="sm">«{brand.name}» буде видалено. Це неможливо скасувати.</Text>,
      labels: { confirm: 'Видалити', cancel: 'Скасувати' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(brand._id);
          notifications.show({ color: 'green', message: 'Бренд видалено' });
        } catch (err: unknown) {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          notifications.show({ color: 'red', message: msg ?? 'Помилка видалення' });
        }
      },
    });
  };

  const isBusy = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Stack>
        <Group justify="space-between">
          <Title order={3}>Бренди</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpen()}>
            Додати бренд
          </Button>
        </Group>

        <Table highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Назва</Table.Th>
              <Table.Th>Slug</Table.Th>
              <Table.Th w={80} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {brands.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={3}>
                  <Text c="dimmed" ta="center" py="xl">Брендів немає</Text>
                </Table.Td>
              </Table.Tr>
            ) : brands.map((brand) => (
              <Table.Tr key={brand._id}>
                <Table.Td fw={500}>{brand.name}</Table.Td>
                <Table.Td fz="sm" c="dimmed">{brand.slug}</Table.Td>
                <Table.Td>
                  <Group gap={4} justify="flex-end">
                    <ActionIcon variant="subtle" onClick={() => handleOpen(brand)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(brand)}>
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
        title={editing ? 'Редагувати бренд' : 'Новий бренд'}
        centered
      >
        <Stack>
          <TextInput
            label="Назва"
            placeholder="Наприклад: Apple"
            value={form.name}
            onChange={(e) => handleNameChange(e.currentTarget.value)}
            required
          />
          <TextInput
            label="Slug"
            placeholder="apple"
            value={form.slug}
            onChange={(e) => { const v = e.currentTarget.value; setForm((f) => ({ ...f, slug: toSlug(v) })); }}
            description="Тільки латиниця, цифри та дефіс"
            required
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

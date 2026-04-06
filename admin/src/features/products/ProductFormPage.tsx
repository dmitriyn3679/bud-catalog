import {
  ActionIcon,
  Box,
  Button,
  Checkbox,
  FileInput,
  Group,
  Image,
  Loader,
  Center,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconTrash, IconUpload } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  useAdminProduct,
  useAdminCategories,
  useAdminBrands,
  useCreateProduct,
  useUpdateProduct,
  useUploadImages,
  useDeleteImage,
} from './useProducts';
import type { Category } from '../../types';

const schema = z.object({
  title: z.string().min(1, 'Обов\'язкове поле'),
  description: z.string().min(1, 'Обов\'язкове поле'),
  price: z.number({ invalid_type_error: 'Введіть число' }).min(0),
  purchasePrice: z.number({ invalid_type_error: 'Введіть число' }).min(0),
  categoryId: z.string().min(1, 'Оберіть категорію'),
  brandId: z.string().min(1, 'Оберіть бренд'),
  stock: z.number().min(0),
  isActive: z.boolean(),
});
type FormData = z.infer<typeof schema>;

function flattenCategories(cats: Category[]): { value: string; label: string }[] {
  return cats.flatMap((cat) => [
    ...(cat.children.length ? [] : [{ value: cat._id, label: cat.name }]),
    ...cat.children.map((sub) => ({ value: sub._id, label: `${cat.name} → ${sub.name}` })),
  ]);
}

export function ProductFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data: product, isLoading: productLoading } = useAdminProduct(id ?? '');
  const { data: categories = [] } = useAdminCategories();
  const { data: brands = [] } = useAdminBrands();

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct(id ?? '');
  const uploadImages = useUploadImages(id ?? '');
  const deleteImage = useDeleteImage(id ?? '');

  const [newFiles, setNewFiles] = useState<File[]>([]);

  const { control, register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isActive: true, stock: 0 },
  });

  useEffect(() => {
    if (product) {
      reset({
        title: product.title,
        description: product.description,
        price: product.price,
        purchasePrice: product.purchasePrice,
        categoryId: product.categoryId._id,
        brandId: product.brandId._id,
        stock: product.stock,
        isActive: product.isActive,
      });
    }
  }, [product, reset]);

  const price = watch('price') ?? 0;
  const purchasePrice = watch('purchasePrice') ?? 0;
  const markupPct = purchasePrice > 0 ? (((price - purchasePrice) / purchasePrice) * 100).toFixed(1) : '—';

  const onSubmit = async (data: FormData) => {
    try {
      let productId = id;
      if (isEdit) {
        await updateProduct.mutateAsync(data);
      } else {
        const created = await createProduct.mutateAsync(data);
        productId = created._id;
      }
      if (newFiles.length && productId) {
        await uploadImages.mutateAsync(newFiles);
      }
      notifications.show({ color: 'green', message: isEdit ? 'Товар оновлено' : 'Товар створено' });
      navigate('/admin/products');
    } catch {
      notifications.show({ color: 'red', message: 'Помилка збереження' });
    }
  };

  const handleDeleteImage = async (publicId: string) => {
    try {
      await deleteImage.mutateAsync(publicId);
      notifications.show({ color: 'green', message: 'Зображення видалено' });
    } catch {
      notifications.show({ color: 'red', message: 'Помилка видалення зображення' });
    }
  };

  if (isEdit && productLoading) return <Center h={300}><Loader /></Center>;

  const categoryOptions = flattenCategories(categories);
  const brandOptions = brands.map((b) => ({ value: b._id, label: b.name }));

  return (
    <Stack maw={720}>
      <Group>
        <Button component={Link} to="/admin/products" variant="subtle" leftSection={<IconArrowLeft size={16} />}>
          Назад
        </Button>
        <Title order={3}>{isEdit ? 'Редагувати товар' : 'Новий товар'}</Title>
      </Group>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack gap="md">
          <Paper withBorder p="lg" radius="md">
            <Stack>
              <TextInput label="Назва" {...register('title')} error={errors.title?.message} />
              <Textarea label="Опис" rows={4} {...register('description')} error={errors.description?.message} />

              <Group grow>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Категорія"
                      data={categoryOptions}
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.categoryId?.message}
                      searchable
                    />
                  )}
                />
                <Controller
                  name="brandId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Бренд"
                      data={brandOptions}
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.brandId?.message}
                      searchable
                    />
                  )}
                />
              </Group>
            </Stack>
          </Paper>

          <Paper withBorder p="lg" radius="md">
            <Title order={5} mb="md">Ціни та склад</Title>
            <Group grow align="flex-start">
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <NumberInput
                    label="Ціна для клієнта (₴)"
                    value={field.value}
                    onChange={field.onChange}
                    min={0}
                    error={errors.price?.message}
                  />
                )}
              />
              <Controller
                name="purchasePrice"
                control={control}
                render={({ field }) => (
                  <NumberInput
                    label="Закупівельна ціна (₴)"
                    value={field.value}
                    onChange={field.onChange}
                    min={0}
                    error={errors.purchasePrice?.message}
                  />
                )}
              />
              <Controller
                name="stock"
                control={control}
                render={({ field }) => (
                  <NumberInput label="Кількість на складі" value={field.value} onChange={field.onChange} min={0} />
                )}
              />
            </Group>
            <Text size="sm" c="dimmed" mt="xs">
              Націнка: <Text span fw={600} c={Number(markupPct) > 0 ? 'green' : 'red'}>{markupPct}%</Text>
            </Text>
          </Paper>

          {/* Images */}
          <Paper withBorder p="lg" radius="md">
            <Title order={5} mb="md">Зображення</Title>
            {isEdit && product?.images.length ? (
              <SimpleGrid cols={4} mb="md">
                {product.images.map((img) => (
                  <Box key={img.publicId} pos="relative">
                    <Image src={img.url} h={90} fit="cover" radius="sm" />
                    <ActionIcon
                      color="red"
                      size="sm"
                      pos="absolute"
                      top={4}
                      right={4}
                      onClick={() => handleDeleteImage(img.publicId)}
                      loading={deleteImage.isPending}
                    >
                      <IconTrash size={12} />
                    </ActionIcon>
                  </Box>
                ))}
              </SimpleGrid>
            ) : null}
            <FileInput
              label={isEdit ? 'Додати нові зображення' : 'Зображення'}
              placeholder="Оберіть файли..."
              leftSection={<IconUpload size={16} />}
              multiple
              accept="image/*"
              value={newFiles}
              onChange={setNewFiles}
            />
            {newFiles.length > 0 && (
              <Text size="xs" c="dimmed" mt={4}>{newFiles.length} файл(ів) обрано</Text>
            )}
          </Paper>

          <Paper withBorder p="lg" radius="md">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Checkbox
                  label="Товар активний (відображається в каталозі)"
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </Paper>

          <Group>
            <Button type="submit" loading={isSubmitting || uploadImages.isPending}>
              {isEdit ? 'Зберегти зміни' : 'Створити товар'}
            </Button>
            <Button variant="default" component={Link} to="/admin/products">Скасувати</Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}

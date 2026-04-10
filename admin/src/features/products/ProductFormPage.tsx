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
import { usePageTitle } from '../../hooks/usePageTitle';

const schema = z.object({
  sku: z.string().max(100).optional(),
  title: z.string().min(1, 'Обов\'язкове поле'),
  description: z.string().min(1, 'Обов\'язкове поле'),
  price: z.number({ invalid_type_error: 'Введіть число' }).min(0),
  purchasePrice: z.number({ invalid_type_error: 'Введіть число' }).min(0),
  categoryId: z.string().min(1, 'Оберіть категорію'),
  brandId: z.string().min(1, 'Оберіть бренд'),
  stock: z.number().min(0).optional(),
  isActive: z.boolean(),
  isPromo: z.boolean(),
  unlimitedStock: z.boolean(),
  hidePrice: z.boolean(),
}).superRefine((data, ctx) => {
  if (!data.unlimitedStock && (data.stock === undefined || data.stock === null)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Вкажіть кількість', path: ['stock'] });
  }
});
type FormData = z.infer<typeof schema>;

function flattenCategories(cats: Category[]): { value: string; label: string }[] {
  return cats.flatMap((cat) => [
    { value: cat._id, label: cat.name },
    ...cat.children.map((sub) => ({ value: sub._id, label: `${cat.name} → ${sub.name}` })),
  ]);
}

export function ProductFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data: product, isLoading: productLoading } = useAdminProduct(id ?? '');
  usePageTitle(isEdit ? (product?.title ? `Редагування: ${product.title}` : 'Редагування товару') : 'Новий товар');
  const { data: categories = [] } = useAdminCategories();
  const { data: brands = [] } = useAdminBrands();

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct(id ?? '');
  const uploadImages = useUploadImages();
  const deleteImage = useDeleteImage(id ?? '');

  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [markup, setMarkup] = useState<number | ''>('');

  const round2 = (n: number) => Math.round(n * 100) / 100;

  const { control, register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { sku: '', isActive: true, isPromo: false, unlimitedStock: false, hidePrice: false, stock: 0 },
  });

  useEffect(() => {
    if (product) {
      reset({
        sku: product.sku ?? '',
        title: product.title,
        description: product.description,
        price: product.price,
        purchasePrice: product.purchasePrice,
        categoryId: product.categoryId._id,
        brandId: product.brandId._id,
        stock: product.stock,
        isActive: product.isActive,
        isPromo: product.isPromo ?? false,
        unlimitedStock: product.unlimitedStock ?? false,
        hidePrice: product.hidePrice ?? false,
      });
      if (product.purchasePrice > 0) {
        setMarkup(round2(((product.price - product.purchasePrice) / product.purchasePrice) * 100));
      }
    }
  }, [product, reset]);

  const unlimitedStock = watch('unlimitedStock');

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
        await uploadImages.mutateAsync({ id: productId, files: newFiles });
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
              <SimpleGrid cols={2} spacing="sm">
                <TextInput label="Назва" {...register('title')} error={errors.title?.message} />
                <TextInput label="Артикул" placeholder="SKU-001" {...register('sku')} error={errors.sku?.message} />
              </SimpleGrid>
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
                name="purchasePrice"
                control={control}
                render={({ field }) => (
                  <NumberInput
                    label="Закупівельна ціна (₴)"
                    value={field.value}
                    onChange={(v) => {
                      const pp = typeof v === 'number' ? v : 0;
                      field.onChange(pp);
                      if (markup !== '' && pp > 0) {
                        setValue('price', round2(pp * (1 + (markup as number) / 100)));
                      } else if (pp > 0) {
                        const p = watch('price') ?? 0;
                        setMarkup(round2(((p - pp) / pp) * 100));
                      }
                    }}
                    min={0}
                    error={errors.purchasePrice?.message}
                  />
                )}
              />
              <NumberInput
                label="Націнка (%)"
                value={markup}
                onChange={(v) => {
                  const m = typeof v === 'number' ? v : '';
                  setMarkup(m);
                  if (typeof m === 'number') {
                    const pp = watch('purchasePrice') ?? 0;
                    if (pp > 0) setValue('price', round2(pp * (1 + m / 100)));
                  }
                }}
                min={0}
                suffix=" %"
                decimalScale={2}
                placeholder="—"
              />
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <NumberInput
                    label="Ціна для клієнта (₴)"
                    value={field.value}
                    onChange={(v) => {
                      const p = typeof v === 'number' ? v : 0;
                      field.onChange(p);
                      const pp = watch('purchasePrice') ?? 0;
                      if (pp > 0) setMarkup(round2(((p - pp) / pp) * 100));
                    }}
                    min={0}
                    error={errors.price?.message}
                  />
                )}
              />
              <Controller
                name="stock"
                control={control}
                render={({ field }) => (
                  <NumberInput
                    label="Кількість на складі"
                    value={unlimitedStock ? 9999 : field.value}
                    onChange={(v) => field.onChange(typeof v === 'number' ? v : undefined)}
                    min={0}
                    disabled={unlimitedStock}
                    error={errors.stock?.message}
                  />
                )}
              />
            </Group>
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
            <Stack gap="sm">
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
              <Controller
                name="isPromo"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    label="Акційний товар (виводиться першим у каталозі)"
                    checked={field.value}
                    onChange={field.onChange}
                    color="orange"
                  />
                )}
              />
              <Controller
                name="unlimitedStock"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    label="Необмежена кількість (купівля не знімає залишок, клієнт бачить +9999)"
                    checked={field.value}
                    onChange={(e) => {
                      field.onChange(e);
                      if (e.currentTarget.checked) setValue('stock', 0, { shouldValidate: true });
                    }}
                    color="blue"
                  />
                )}
              />
              <Controller
                name="hidePrice"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    label="Приховати ціну (клієнт бачить «Ціна за запитом», не може додати до кошика)"
                    checked={field.value}
                    onChange={field.onChange}
                    color="violet"
                  />
                )}
              />
            </Stack>
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

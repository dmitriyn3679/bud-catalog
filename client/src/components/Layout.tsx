import { Anchor, AppShell, Badge, Box, Burger, Group, Text, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconHeart, IconShoppingCart, IconUser } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';
import { useCartCount } from '../features/cart/useCart';

export function Layout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const { user, logout } = useAuth();
  const cartCount = useCartCount();
  const navigate = useNavigate();

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Anchor component={Link} to="/" fw={700} size="lg" c="dark" style={{ textDecoration: 'none' }}>
              Catalog Shop
            </Anchor>
          </Group>

          <Group gap="sm">
            <UnstyledButton component={Link} to="/favorites">
              <IconHeart size={22} />
            </UnstyledButton>

            <Box pos="relative" component={Link} to="/cart" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>
              <IconShoppingCart size={22} />
              {cartCount > 0 && (
                <Badge size="xs" pos="absolute" top={-6} right={-8} circle>
                  {cartCount}
                </Badge>
              )}
            </Box>

            {user ? (
              <Group gap="xs">
                <UnstyledButton component={Link} to="/profile">
                  <IconUser size={22} />
                </UnstyledButton>
                <Text
                  size="sm"
                  c="dimmed"
                  style={{ cursor: 'pointer' }}
                  onClick={() => { logout(); navigate('/'); }}
                >
                  Вийти
                </Text>
              </Group>
            ) : (
              <Anchor component={Link} to="/login" size="sm">
                Увійти
              </Anchor>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}

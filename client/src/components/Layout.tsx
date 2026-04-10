import {
  AppShell,
  Badge,
  Box,
  Burger,
  Group,
  Text,
  UnstyledButton,
} from '@mantine/core';
import {
  IconHeart,
  IconShoppingBag,
  IconUser,
  IconLogout,
} from '@tabler/icons-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';
import { useCartCount } from '../features/cart/useCart';
import { useCatalogDrawer } from '../context/CatalogDrawerContext';

const NAV_LINK: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  color: 'var(--mantine-color-dark-6)',
  textDecoration: 'none',
  padding: '6px 8px',
  borderRadius: 6,
  transition: 'background 0.15s',
};

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const cartCount = useCartCount();
  const navigate = useNavigate();
  const location = useLocation();
  const catalogDrawer = useCatalogDrawer();
  const isCatalog = location.pathname === '/';

  return (
    <AppShell
      header={{ height: 56 }}
      padding={0}
      styles={{
        header: {
          borderBottom: '1px solid var(--mantine-color-gray-2)',
          background: '#fff',
        },
        main: {
          background: 'var(--mantine-color-gray-0)',
          minHeight: 'calc(100vh - 56px)',
        },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px={{ base: 'md', sm: 'xl' }} justify="space-between">
          {/* Burger — mobile catalog only */}
          {isCatalog && (
            <Burger
              hiddenFrom="sm"
              opened={catalogDrawer.opened}
              onClick={catalogDrawer.opened ? catalogDrawer.close : catalogDrawer.open}
              size="sm"
            />
          )}

          {/* Logo */}
          <Text
            component={Link}
            to="/"
            fw={700}
            size="lg"
            style={{ textDecoration: 'none', color: 'var(--mantine-color-dark-8)', letterSpacing: -0.5 }}
          >
            BUD-CATALOG
          </Text>

          {/* Nav */}
          <Group gap={4}>
            <Box
              component={Link}
              to="/favorites"
              style={NAV_LINK}
            >
              <IconHeart size={20} stroke={1.8} />
            </Box>

            <Box
              component={Link}
              to="/cart"
              style={{ ...NAV_LINK, position: 'relative' }}
            >
              <IconShoppingBag size={20} stroke={1.8} />
              {cartCount > 0 && (
                <Badge
                  size="xs"
                  pos="absolute"
                  top={2}
                  right={2}
                  circle
                  styles={{ root: { fontSize: 10, minWidth: 16, height: 16, padding: 0 } }}
                >
                  {cartCount}
                </Badge>
              )}
            </Box>

            {user ? (
              <>
                <Box component={Link} to="/profile" style={NAV_LINK}>
                  <IconUser size={20} stroke={1.8} />
                  <Text size="sm" visibleFrom="sm">{user.name.split(' ')[0]}</Text>
                </Box>
                <UnstyledButton
                  style={{ ...NAV_LINK, color: 'var(--mantine-color-gray-5)' }}
                  onClick={() => { logout(); navigate('/'); }}
                >
                  <IconLogout size={18} stroke={1.8} />
                </UnstyledButton>
              </>
            ) : (
              <Box component={Link} to="/login" style={NAV_LINK}>
                <IconUser size={20} stroke={1.8} />
                <Text size="sm">Увійти</Text>
              </Box>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Box px={{ base: 'md', sm: 'xl' }} py="lg" maw={1280} mx="auto">
          {children}
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}

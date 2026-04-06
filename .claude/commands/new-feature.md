# New Frontend Feature

Create a complete frontend feature module based on the user's arguments.
Determine if it's for `client/` or `admin/` from context.

Follow this structure inside `src/features/<featureName>/`:

**`<Feature>Page.tsx`** — page component, only layout + composition
```tsx
import { useFeature } from './useFeature';

export function FeaturePage() {
  const { data, isLoading } = useFeature();
  // render
}
```

**`use<Feature>.ts`** — all logic, TanStack Query hooks, form setup
```ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { getFeature } from './featureApi';

export function useFeature() {
  return useQuery({ queryKey: ['feature'], queryFn: getFeature });
}
```

**`<feature>Api.ts`** — API calls using `api` from `../../api/axios`
```ts
import { api } from '../../api/axios';

export const getFeature = async () => {
  const { data } = await api.get('/feature');
  return data;
};
```

**`<feature>.types.ts`** — TypeScript types for this feature

Generate all files for: $ARGUMENTS

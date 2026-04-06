# New API Route

Create a complete backend route for the feature described by the user's arguments.

Follow this pattern:

**1. Route file** — `backend/src/routes/<feature>.routes.ts`
```ts
import { Router } from 'express';
import { auth } from '../middlewares/auth';
import * as controller from '../controllers/<feature>.controller';

export const <feature>Router = Router();

<feature>Router.get('/', auth, controller.getAll);
// ... other routes
```

**2. Controller** — `backend/src/controllers/<feature>.controller.ts`
Thin: parse request, call service, send response. Use `AppError` for errors.
```ts
import { Request, Response } from 'express';
import * as service from '../services/<feature>.service';

export const getAll = async (req: Request, res: Response) => {
  const data = await service.getAll(req.user!.id);
  res.json(data);
};
```

**3. Service** — `backend/src/services/<feature>.service.ts`
All business logic and DB queries here.

**4. Register route** in `backend/src/index.ts`:
```ts
import { <feature>Router } from './routes/<feature>.routes';
app.use('/api/<feature>', <feature>Router);
```

Generate all three files for: $ARGUMENTS

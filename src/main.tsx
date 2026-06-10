import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { type RouteObject, createBrowserRouter, RouterProvider } from 'react-router'
import { command, createStore } from 'ccstate'
import { StoreProvider } from 'ccstate-react'
import { detach, Reason } from './utils/detach.ts'
import type { RouteCommand } from './routes/route-command.ts'
import { createRouteContext } from './routes/route-scope.ts'
import { Root } from './routes/route.tsx'
import App from './App.tsx'
import { createHomePage } from './routes/pages/home.tsx'
import { createAboutPage } from './routes/pages/about.tsx'
import { createColumnsPage } from './routes/pages/columns.tsx'

interface CommandRouteObject extends Omit<RouteObject, 'children'> {
  command$?: RouteCommand
  children?: CommandRouteObject[]
}

function createRouterFactory() {
  const createRouter$ = command(
    ({ set }, routes: CommandRouteObject[], rootSignal: AbortSignal) => {
      const routeScope = set(createRouteContext())

      function resolveRoutes(routes: CommandRouteObject[]): RouteObject[] {
        return routes.map((route) => {
          const { command$, children, ...rest } = route
          const resolved: RouteObject = { ...rest }

          if (command$) {
            const routeCommand$ = command$
            resolved.element = <Root routeScope={routeScope} />
            resolved.loader = () => {
              detach(set(routeScope.navigateToRoute$, routeCommand$, rootSignal), Reason.Root)
              return null
            }
          }

          if (children) {
            resolved.children = resolveRoutes(children)
          }

          return resolved
        })
      }

      return createBrowserRouter(resolveRoutes(routes))
    },
  )
  return createRouter$
}

const store = createStore()
const rootSignal = new AbortController().signal

const router = store.set(
  createRouterFactory(),
  [
    {
      path: '/',
      element: <App />,
      children: [
        { index: true, command$: createHomePage() },
        { path: 'about', command$: createAboutPage() },
        { path: 'columns', command$: createColumnsPage() },
      ],
    },
  ],
  rootSignal,
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider value={store}>
      <RouterProvider router={router} />
    </StoreProvider>
  </StrictMode>,
)

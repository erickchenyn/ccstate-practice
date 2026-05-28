import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { type RouteObject, createBrowserRouter, RouterProvider } from 'react-router'
import { command, createStore } from 'ccstate'
import { StoreProvider } from 'ccstate-react'
import { detach } from './tools/utils/detach.ts'
import type { RouteCommand } from './types/route-command.ts'
import { createRouteScope$ } from './tools/route-scope.ts'
import { RouteView } from './views/route-view.tsx'
import App from './App.tsx'
import { homeCommand$ } from './views/pages/home.tsx'
import { aboutCommand$ } from './views/pages/about.tsx'
import { columnsCommand$ } from './views/pages/columns.tsx'
import { Reason } from './types/utils/detach-reason.ts'

interface CommandRouteObject extends Omit<RouteObject, 'children'> {
  command$?: RouteCommand
  children?: CommandRouteObject[]
}

const createRouter$ = command(({ set }, routes: CommandRouteObject[], rootSignal: AbortSignal) => {
  const routeScope = set(createRouteScope$)

  function resolveRoutes(routes: CommandRouteObject[]): RouteObject[] {
    return routes.map((route) => {
      const { command$, children, ...rest } = route
      const resolved: RouteObject = { ...rest }

      if (command$) {
        const routeCommand$ = command$
        resolved.element = <RouteView routeScope={routeScope} />
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
})

const store = createStore()
const rootSignal = new AbortController().signal

const router = store.set(
  createRouter$,
  [
    {
      path: '/',
      element: <App />,
      children: [
        { index: true, command$: homeCommand$ },
        { path: 'about', command$: aboutCommand$ },
        { path: 'columns', command$: columnsCommand$ },
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

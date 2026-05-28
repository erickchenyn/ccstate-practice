import { useGet } from 'ccstate-react'
import type { RouteScope } from '../common/route-scope.ts'

export function Root({ routeScope }: { routeScope: RouteScope }) {
  const node = useGet(routeScope.renderedNode$)
  const loading = useGet(routeScope.routeLoading$)
  const error = useGet(routeScope.routeError$)

  if (loading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return <>{node}</>
}

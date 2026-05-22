import { Link, Outlet } from 'react-router'

export default function App() {
  return (
    <div>
      <nav>
        <Link to="/">Home</Link>
        {' | '}
        <Link to="/about">About</Link>
        {' | '}
        <Link to="/columns">Columns</Link>
      </nav>
      <hr />
      <Outlet />
    </div>
  )
}

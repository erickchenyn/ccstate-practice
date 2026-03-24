import { Link, Outlet } from 'react-router'

export default function App() {
  return (
    <div>
      <nav>
        <Link to="/">Home</Link>
        {' | '}
        <Link to="/about">About</Link>
      </nav>
      <hr />
      <Outlet />
    </div>
  )
}

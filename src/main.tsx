import { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import LoginGate from './components/LoginGate'
import './index.css'

function Root() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('kzc_auth') === '1')

  if (!authed) {
    return <LoginGate onSuccess={() => setAuthed(true)} />
  }

  return <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />)

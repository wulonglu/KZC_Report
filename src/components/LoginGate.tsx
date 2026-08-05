import { useState, useRef, useEffect, type FormEvent } from 'react'

const PASSWORD_HASH = '275a17b50d46ccb65554697d4ab4be85eb51d34b2da3b431af8505df69b67afc'

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

interface Props {
  onSuccess: () => void
}

export default function LoginGate({ onSuccess }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return
    setLoading(true)
    setError('')

    try {
      const hash = await sha256(password)
      if (hash === PASSWORD_HASH) {
        sessionStorage.setItem('kzc_auth', '1')
        onSuccess()
      } else {
        setError('密码错误，请重试')
        setPassword('')
        inputRef.current?.focus()
      }
    } catch {
      setError('验证失败，请刷新重试')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 20% 0%, #0a2a5e 0%, #041832 50%, #020d1f 100%)',
    }}>
      <form onSubmit={handleSubmit} style={{
        background: 'rgba(255,255,255,.06)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 16,
        padding: '44px 36px',
        width: 360,
        border: '1px solid rgba(255,255,255,.1)',
        boxShadow: '0 20px 60px rgba(0,0,0,.3)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <svg width='40' height='40' viewBox='0 0 100 100' style={{ marginBottom: 12 }}>
            <circle cx='50' cy='50' r='48' fill='#0066cc'/>
            <defs>
              <clipPath id='pepsiClip'><circle cx='50' cy='50' r='46'/></clipPath>
              <linearGradient id='pepsiGrad' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor='#0066cc'/><stop offset='38%' stopColor='#0066cc'/>
                <stop offset='42%' stopColor='white'/><stop offset='58%' stopColor='white'/>
                <stop offset='62%' stopColor='#e32934'/><stop offset='100%' stopColor='#e32934'/>
              </linearGradient>
            </defs>
            <g clipPath='url(#pepsiClip)'>
              <ellipse cx='45' cy='48' rx='55' ry='12' fill='white' transform='rotate(-5 50 50)'/>
            </g>
          </svg>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px', letterSpacing: '-.3px' }}>
            百事可乐日报系统
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', margin: 0 }}>
            请输入密码以查看数据
          </p>
        </div>

        {/* Password Input */}
        <div style={{ position: 'relative' }}>
          <input
            ref={inputRef}
            type='password'
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(e) }}
            placeholder='输入访问密码'
            autoComplete='off'
            style={{
              width: '100%',
              padding: '13px 16px',
              fontSize: 15,
              borderRadius: 10,
              border: `1.5px solid ${error ? 'rgba(255,100,100,.4)' : 'rgba(255,255,255,.12)'}`,
              background: 'rgba(255,255,255,.06)',
              color: '#fff',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color .2s',
            }}
          />
        </div>

        {error && (
          <p style={{ color: '#ff6b6b', fontSize: 12, margin: '10px 0 0', textAlign: 'center' }}>
            {error}
          </p>
        )}

        <button
          type='submit'
          disabled={loading || !password.trim()}
          style={{
            width: '100%',
            marginTop: 18,
            padding: '13px',
            fontSize: 15,
            fontWeight: 600,
            borderRadius: 10,
            border: 'none',
            background: loading || !password.trim()
              ? 'rgba(255,255,255,.08)'
              : 'linear-gradient(135deg, #0066cc, #004a99)',
            color: loading || !password.trim() ? 'rgba(255,255,255,.25)' : '#fff',
            cursor: loading || !password.trim() ? 'not-allowed' : 'pointer',
            transition: 'all .2s',
            fontFamily: 'inherit',
            letterSpacing: '.5px',
          }}
        >
          {loading ? '验证中...' : '登  录'}
        </button>
      </form>
    </div>
  )
}

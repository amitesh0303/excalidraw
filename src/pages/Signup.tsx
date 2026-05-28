import { useState, FormEvent, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PageTransition } from '../components/PageTransition'

function getPasswordStrength(password: string): { level: number; label: string } {
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[a-z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++

    if (score <= 1) return { level: 1, label: 'Weak' }
    if (score === 2) return { level: 2, label: 'Fair' }
    if (score === 3) return { level: 3, label: 'Good' }
    return { level: 4, label: 'Strong' }
}

export default function Signup() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({})
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)
    const [shaking, setShaking] = useState(false)
    const { signUp } = useAuth()
    const navigate = useNavigate()

    const passwordStrength = useMemo(() => getPasswordStrength(password), [password])

    const triggerShake = () => {
        setShaking(true)
        setTimeout(() => setShaking(false), 500)
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        setFieldErrors({})
        setSuccess(false)

        const errors: typeof fieldErrors = {}

        if (!email) {
            errors.email = 'Email is required'
        }

        if (password.length < 6) {
            errors.password = 'Password must be at least 6 characters'
        }

        if (password !== confirmPassword) {
            errors.confirmPassword = 'Passwords do not match'
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors)
            triggerShake()
            return
        }

        setLoading(true)

        const { error } = await signUp(email, password)

        if (error) {
            setError(error.message)
            setLoading(false)
            triggerShake()
        } else {
            setSuccess(true)
            setLoading(false)
            // Redirect to login after 2 seconds
            setTimeout(() => navigate('/login'), 2000)
        }
    }

    const strengthColors: Record<number, string> = {
        1: 'var(--error)',
        2: '#f08c00',
        3: 'var(--success)',
        4: '#2f9e44',
    }

    return (
        <PageTransition>
        <div className="auth-container">
            <div className={`auth-card ${shaking ? 'form-shake' : ''}`}>
                <div className="auth-header">
                    <div className="auth-logo">✏️</div>
                    <h1 className="auth-title">Create Account</h1>
                    <p className="auth-subtitle">Start drawing for free</p>
                </div>

                {success && (
                    <div className="error-message" style={{ background: 'rgba(35, 134, 54, 0.15)', color: '#238636' }}>
                        Account created! Check your email to verify your account. Redirecting to login...
                    </div>
                )}

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            className={`form-input ${fieldErrors.email ? 'form-input-error' : ''}`}
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading || success}
                            aria-invalid={!!fieldErrors.email}
                            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                        />
                        {fieldErrors.email && (
                            <span id="email-error" className="field-error">{fieldErrors.email}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            className={`form-input ${fieldErrors.password ? 'form-input-error' : ''}`}
                            placeholder="At least 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            disabled={loading || success}
                            aria-invalid={!!fieldErrors.password}
                            aria-describedby={fieldErrors.password ? 'password-error' : 'password-strength'}
                        />
                        {fieldErrors.password && (
                            <span id="password-error" className="field-error">{fieldErrors.password}</span>
                        )}
                        {password.length > 0 && (
                            <div id="password-strength" className="password-strength" aria-label={`Password strength: ${passwordStrength.label}`}>
                                <div className="strength-bar">
                                    {[1, 2, 3, 4].map(level => (
                                        <div
                                            key={level}
                                            className="strength-segment"
                                            style={{
                                                background: level <= passwordStrength.level
                                                    ? strengthColors[passwordStrength.level]
                                                    : 'rgba(255,255,255,0.1)',
                                            }}
                                        />
                                    ))}
                                </div>
                                <span className="strength-label" style={{ color: strengthColors[passwordStrength.level] }}>
                                    {passwordStrength.label}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            className={`form-input ${fieldErrors.confirmPassword ? 'form-input-error' : ''}`}
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                            disabled={loading || success}
                            aria-invalid={!!fieldErrors.confirmPassword}
                            aria-describedby={fieldErrors.confirmPassword ? 'confirm-error' : undefined}
                        />
                        {fieldErrors.confirmPassword && (
                            <span id="confirm-error" className="field-error">{fieldErrors.confirmPassword}</span>
                        )}
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading || success}>
                        {loading ? 'Creating account...' : success ? 'Account created!' : 'Create Account'}
                    </button>
                </form>

                <p className="auth-footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </p>
            </div>
        </div>
        </PageTransition>
    )
}

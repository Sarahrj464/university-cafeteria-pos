import { useState, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Button from '../components/ui/Button';
import FormInput from '../components/ui/FormInput';
import PasswordStrengthMeter from '../components/ui/PasswordStrengthMeter';
import { getRoleRedirectPath } from '../utils/storage';
import { validateSignIn, validateSignUp } from '../utils/validation';
import { APP_NAME, APP_POS_NAME } from '../config/appConfig';

const TABS = { SIGN_IN: 'signin', SIGN_UP: 'signup' };

function BrandingPanel() {
  return (
    <div className="hidden lg:flex h-full min-h-0 flex-col items-center justify-center bg-forest p-10 text-cream">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-accent">
          <UtensilsCrossed size={40} className="text-cream" />
        </div>
        <h1 className="mb-3 text-4xl font-bold tracking-tight">{APP_NAME}</h1>
        <p className="mb-2 text-xl font-medium text-accent-light">Point of Sale System</p>
        <p className="text-base text-cream/80 leading-relaxed">
          Fast, reliable ordering for students, cashiers, and kitchen staff.
        </p>
      </div>
    </div>
  );
}

function AuthTabs({ activeTab, onTabChange }) {
  return (
    <div className="flex border-b border-forest/10">
      {[
        { id: TABS.SIGN_IN, label: 'Sign In' },
        { id: TABS.SIGN_UP, label: 'Sign Up' },
      ].map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onTabChange(id)}
          className={`flex-1 py-3 text-base font-semibold transition-colors ${
            activeTab === id
              ? 'border-b-2 border-accent text-accent'
              : 'text-forest/50 hover:text-forest'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function SignInForm({ onSwitchTab }) {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const validateField = useCallback(
    (field, values = { email, password }) => {
      const fieldErrors = validateSignIn(values);
      setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] }));
    },
    [email, password]
  );

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field);
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (touched.email) validateField('email', { email: value, password });
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (touched.password) validateField('password', { email, password: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formErrors = validateSignIn({ email, password });
    setErrors(formErrors);
    setTouched({ email: true, password: true });
    if (Object.keys(formErrors).length > 0) return;

    setSubmitting(true);
    setFormError('');
    try {
      const redirectPath = await login(email, password);
      toast.success('Welcome back!');
      navigate(redirectPath, { replace: true });
    } catch (err) {
      if (err.code === 'INVALID_CREDENTIALS') {
        setFormError(err.message);
      }
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {formError && (
        <div className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm font-medium text-error" role="alert">
          {formError}
        </div>
      )}
      <FormInput
        label="Email Address"
        type="email"
        name="email"
        value={email}
        onChange={handleEmailChange}
        onBlur={() => handleBlur('email')}
        placeholder="you@university.edu"
        error={touched.email ? errors.email : undefined}
        autoComplete="email"
        disabled={submitting}
      />

      <FormInput
        label="Password"
        type={showPassword ? 'text' : 'password'}
        name="password"
        value={password}
        onChange={handlePasswordChange}
        onBlur={() => handleBlur('password')}
        placeholder="Enter your password"
        error={touched.password ? errors.password : undefined}
        autoComplete="current-password"
        disabled={submitting}
        showPasswordToggle
        showPassword={showPassword}
        onTogglePassword={() => setShowPassword((v) => !v)}
      />

      <Button type="submit" variant="accent" size="md" className="w-full" disabled={submitting}>
        {submitting ? 'Signing in...' : 'Sign In'}
      </Button>

      <p className="text-center text-sm text-forest/70">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={() => onSwitchTab(TABS.SIGN_UP)}
          className="font-semibold text-accent hover:underline"
        >
          Sign Up
        </button>
      </p>

      <div className="rounded-xl border border-forest/10 bg-white p-3">
        <p className="mb-1.5 text-xs font-semibold text-forest">Demo Accounts</p>
        <div className="space-y-0.5 text-xs text-forest/70">
          <p>Admin: admin@university.edu</p>
          <p>Cashier: cashier1@university.edu</p>
          <p>Kitchen: kitchen@university.edu</p>
          <p>Student: student1@university.edu</p>
        </div>
      </div>
    </form>
  );
}

function SignUpForm({ onSwitchTab }) {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'student',
    studentId: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (touched[field]) {
        const fieldErrors = validateSignUp(next);
        setErrors((e) => ({ ...e, [field]: fieldErrors[field] }));
        if (field === 'password' && touched.confirmPassword) {
          setErrors((e) => ({ ...e, confirmPassword: fieldErrors.confirmPassword }));
        }
      }
      return next;
    });
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const fieldErrors = validateSignUp(form);
    setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formErrors = validateSignUp(form);
    setErrors(formErrors);
    setTouched({
      name: true,
      email: true,
      role: true,
      studentId: true,
      password: true,
      confirmPassword: true,
    });
    if (Object.keys(formErrors).length > 0) return;

    setSubmitting(true);
    try {
      const redirectPath = await register({
        name: form.name,
        email: form.email,
        role: form.role,
        studentId: form.role === 'student' ? form.studentId : undefined,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      toast.success('Account created successfully!');
      navigate(redirectPath, { replace: true });
    } catch (err) {
      if (err.code === 'EMAIL_EXISTS') {
        setErrors((prev) => ({ ...prev, email: err.message }));
      } else if (err.code === 'STUDENT_ID_EXISTS') {
        setErrors((prev) => ({ ...prev, studentId: err.message }));
      } else if (err.code === 'WEAK_PASSWORD') {
        setErrors((prev) => ({ ...prev, password: err.message }));
      }
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <FormInput
        label="Full Name"
        name="name"
        value={form.name}
        onChange={(e) => updateField('name', e.target.value)}
        onBlur={() => handleBlur('name')}
        placeholder="John Doe"
        error={touched.name ? errors.name : undefined}
        autoComplete="name"
        disabled={submitting}
      />

      <FormInput
        label="Email Address"
        type="email"
        name="email"
        value={form.email}
        onChange={(e) => updateField('email', e.target.value)}
        onBlur={() => handleBlur('email')}
        placeholder="you@university.edu"
        error={touched.email ? errors.email : undefined}
        autoComplete="email"
        disabled={submitting}
      />

      <FormInput
        as="select"
        label="Role"
        name="role"
        value={form.role}
        onChange={(e) => updateField('role', e.target.value)}
        onBlur={() => handleBlur('role')}
        error={touched.role ? errors.role : undefined}
        disabled={submitting}
        options={[
          { value: 'student', label: 'Student' },
          { value: 'cashier', label: 'Cashier' },
        ]}
      />

      {form.role === 'student' && (
        <FormInput
          label="Student ID"
          name="studentId"
          value={form.studentId}
          onChange={(e) => updateField('studentId', e.target.value)}
          onBlur={() => handleBlur('studentId')}
          placeholder="STU-2024-001"
          error={touched.studentId ? errors.studentId : undefined}
          disabled={submitting}
        />
      )}

      <div>
        <FormInput
          label="Password"
          type={showPassword ? 'text' : 'password'}
          name="password"
          value={form.password}
          onChange={(e) => updateField('password', e.target.value)}
          onBlur={() => handleBlur('password')}
          placeholder="Create a password"
          error={touched.password ? errors.password : undefined}
          autoComplete="new-password"
          disabled={submitting}
          showPasswordToggle
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword((v) => !v)}
        />
        <PasswordStrengthMeter password={form.password} />
      </div>

      <FormInput
        label="Confirm Password"
        type={showConfirm ? 'text' : 'password'}
        name="confirmPassword"
        value={form.confirmPassword}
        onChange={(e) => updateField('confirmPassword', e.target.value)}
        onBlur={() => handleBlur('confirmPassword')}
        placeholder="Confirm your password"
        error={touched.confirmPassword ? errors.confirmPassword : undefined}
        autoComplete="new-password"
        disabled={submitting}
        showPasswordToggle
        showPassword={showConfirm}
        onTogglePassword={() => setShowConfirm((v) => !v)}
      />

      <Button type="submit" variant="accent" size="md" className="w-full" disabled={submitting}>
        {submitting ? 'Creating account...' : 'Create Account'}
      </Button>

      <p className="text-center text-xs text-forest/60">
        By creating an account, you agree to our{' '}
        <a href="#" className="font-medium text-accent hover:underline" onClick={(e) => e.preventDefault()}>
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="#" className="font-medium text-accent hover:underline" onClick={(e) => e.preventDefault()}>
          Privacy Policy
        </a>
        .
      </p>

      <p className="text-center text-sm text-forest/70">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => onSwitchTab(TABS.SIGN_IN)}
          className="font-semibold text-accent hover:underline"
        >
          Sign In
        </button>
      </p>
    </form>
  );
}

export default function AuthPage() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState(TABS.SIGN_IN);

  if (!isLoading && isAuthenticated && user) {
    return <Navigate to={getRoleRedirectPath(user.role)} replace />;
  }

  return (
    <div className="auth-layout grid h-screen grid-cols-1 overflow-hidden lg:grid-cols-2">
      <BrandingPanel />

      <div className="flex h-full min-h-0 flex-col bg-cream">
        <div className="flex shrink-0 items-center justify-center gap-2 bg-forest px-4 py-3 lg:hidden">
          <UtensilsCrossed size={22} className="text-accent" />
          <span className="text-base font-bold text-cream">{APP_POS_NAME}</span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-5 py-4 sm:px-8">
          <div className="mx-auto flex h-full w-full max-w-md min-h-0 flex-1 flex-col">
            <div className="shrink-0">
              <h2 className="mb-1 text-2xl font-bold text-forest">
                {activeTab === TABS.SIGN_IN ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="mb-4 text-sm text-forest/70">
                {activeTab === TABS.SIGN_IN
                  ? 'Sign in to access your dashboard'
                  : 'Register as a student or cashier'}
              </p>

              <AuthTabs activeTab={activeTab} onTabChange={setActiveTab} />
            </div>

            <div className="auth-form-scroll min-h-0 flex-1 overflow-y-auto pt-4 pb-8">
              {activeTab === TABS.SIGN_IN ? (
                <SignInForm onSwitchTab={setActiveTab} />
              ) : (
                <SignUpForm onSwitchTab={setActiveTab} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

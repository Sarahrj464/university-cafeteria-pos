import { useNavigate } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getRoleRedirectPath } from '../utils/storage';
import Button from '../components/ui/Button';

export default function Unauthorized() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleGoBack = () => {
    if (user) {
      navigate(getRoleRedirectPath(user.role));
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <ShieldX size={40} className="text-red-600" />
        </div>
        <h1 className="mb-3 text-3xl font-bold text-forest">Access Denied</h1>
        <p className="mb-8 text-lg text-forest/70">
          You don&apos;t have permission to view this page. Please contact an
          administrator if you believe this is an error.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button variant="accent" size="md" onClick={handleGoBack}>
            Go to My Dashboard
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}

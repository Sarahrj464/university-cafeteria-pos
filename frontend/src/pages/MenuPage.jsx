import { LogOut, BookOpen } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

export default function MenuPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-cream">
      <header className="flex items-center justify-between bg-forest px-6 py-4 text-cream">
        <div className="flex items-center gap-3">
          <BookOpen size={28} className="text-accent" />
          <div>
            <h1 className="text-xl font-bold">Student Menu</h1>
            <p className="text-sm text-cream/70">
              {user?.studentId ? `ID: ${user.studentId}` : 'Browse & Order'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-medium">{user?.name}</p>
            <Badge variant="accent">{user?.role}</Badge>
          </div>
          <Button variant="ghost" size="sm" className="text-cream hover:bg-forest-light" onClick={logout}>
            <LogOut size={20} />
            Logout
          </Button>
        </div>
      </header>
      <main className="flex flex-col items-center justify-center p-12">
        <div className="max-w-lg rounded-2xl border-2 border-dashed border-forest/20 bg-white p-12 text-center">
          <h2 className="mb-3 text-2xl font-bold text-forest">Menu Module</h2>
          <p className="text-lg text-forest/70">
            Student ordering interface coming in Phase 2.
          </p>
        </div>
      </main>
    </div>
  );
}

import TopBar from '@/components/TopBar';
import AdminDashboard from './AdminDashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Admin · SocialCar',
};

export default function AdminPage() {
  return (
    <>
      <TopBar title="Admin" />
      <AdminDashboard />
    </>
  );
}

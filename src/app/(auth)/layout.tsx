import { AuthDesignChamber } from '@/components/auth/AuthDesignChamber';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthDesignChamber>{children}</AuthDesignChamber>;
}

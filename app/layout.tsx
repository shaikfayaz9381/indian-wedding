import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { AuthProvider } from '@/components/firebase-provider';

export const metadata: Metadata = {
  title: 'Indian Wedding Website Generator',
  description: 'Create and share your beautiful Indian wedding website in minutes.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

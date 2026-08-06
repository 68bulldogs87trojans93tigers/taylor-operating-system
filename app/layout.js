import './styles.css';

export const metadata = {
  title: 'Taylor Operating System',
  description: 'Shared project management and operating dashboard'
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}

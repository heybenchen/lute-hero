import "./globals.css";

export const metadata = {
  title: "The Bestiary — Battle of the Bands",
  description: "Monster manager for the musician-pun campaign.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

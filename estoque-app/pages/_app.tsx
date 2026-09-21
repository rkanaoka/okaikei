import type { AppProps } from 'next/app';
import Head from 'next/head';
import '@/styles/globals.css';
import { ToastProvider } from '@/components/ToastProvider';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Estoque Bodogami</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0D1B2A" />
      </Head>
      <ToastProvider>
        <Component {...pageProps} />
      </ToastProvider>
    </>
  );
}

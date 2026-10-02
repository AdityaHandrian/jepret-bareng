import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './ui/App';
import { applyTheme, settings } from './ui/settings';
import './ui/styles.css';

applyTheme(settings.value.theme);
render(<App />, document.getElementById('app')!);

// PWA: Mode Satu Layar tetap jalan offline setelah kunjungan pertama (F-12, NF-08).
if (import.meta.env.PROD) registerSW({ immediate: true });

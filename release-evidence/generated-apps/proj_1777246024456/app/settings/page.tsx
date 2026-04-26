import { validateProjectName } from '../../lib/formValidation';
export default function SettingsPage() { const ok = validateProjectName('Control Plane'); return <section><h2>Settings</h2><p>Validation: {ok ? 'ok' : 'invalid'}</p></section>; }

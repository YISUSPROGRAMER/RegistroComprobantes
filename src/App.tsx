import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { MainLayout } from './layouts/MainLayout';
import { Dashboard } from './components/Dashboard';
import { ComprobantesList } from './components/ComprobantesList';
import { ComprobanteForm } from './components/ComprobanteForm';
import { TercerosList } from './components/TercerosList';
import { TerceroForm } from './components/TerceroForm';
import { SettingsPage } from './components/SettingsPage';

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/comprobantes" replace />} />
          <Route path="estadisticas" element={<Dashboard />} />
          <Route path="comprobantes" element={<ComprobantesList />} />
          <Route path="comprobantes/new" element={<ComprobanteForm />} />
          <Route path="comprobantes/:id/edit" element={<ComprobanteForm />} />
          <Route path="terceros" element={<TercerosList />} />
          <Route path="terceros/new" element={<TerceroForm />} />
          <Route path="terceros/:id/edit" element={<TerceroForm />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

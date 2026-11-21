import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastContainer } from './components/ui/ToastContainer';
import { CommandCenter } from './pages/CommandCenter';
import { MediaStudio } from './pages/MediaStudio';
import { AIClipIntelligence } from './pages/AIClipIntelligence';
import { ContentStudio } from './pages/ContentStudio';
import { CreatorMemory } from './pages/CreatorMemory';
import { ContentCalendar } from './pages/ContentCalendar';
import { PerformanceIntelligence } from './pages/PerformanceIntelligence';
import { VideoEditor } from './pages/VideoEditor';
import { ContentLibrary } from './pages/ContentLibrary';
import { SettingsIntegrations } from './pages/SettingsIntegrations';
import { Login } from './pages/Login';
import { getAccessToken } from './lib/api';

export default function App() {
  if (!getAccessToken()) {
    return (
      <ThemeProvider>
        <ToastProvider>
          <Login />
          <ToastContainer />
        </ToastProvider>
      </ThemeProvider>
    );
  }
  return (
    <ThemeProvider>
      <ToastProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<CommandCenter />} />
            <Route path="/studio" element={<MediaStudio />} />
            <Route path="/clips" element={<AIClipIntelligence />} />
            <Route path="/content" element={<ContentStudio />} />
            <Route path="/memory" element={<CreatorMemory />} />
            <Route path="/calendar" element={<ContentCalendar />} />
            <Route path="/analytics" element={<PerformanceIntelligence />} />
            <Route path="/editor" element={<VideoEditor />} />
            <Route path="/library" element={<ContentLibrary />} />
            <Route path="/settings" element={<SettingsIntegrations />} />
          </Routes>
        </Layout>
        <ToastContainer />
      </ToastProvider>
    </ThemeProvider>
  );
}

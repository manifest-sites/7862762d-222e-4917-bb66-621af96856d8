import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import Monetization from './components/monetization/Monetization';
import { AuthProvider } from './contexts/AuthContext';
import AppLayout from './components/Layout/AppLayout';
import Dashboard from './pages/Dashboard';
import { getRouterBasename } from './utils/routerUtils';
import PeopleRoutes from './pages/People';
import HouseholdsRoutes from './pages/Households';
import TagsPage from './pages/Tags';
import ProfileFieldsPage from './pages/Settings/ProfileFields';

function App() {
  return (
    <Monetization>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1890ff',
          },
        }}
      >
        <AuthProvider>
          <Router basename={getRouterBasename()}>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/people/*" element={<PeopleRoutes />} />
                <Route path="/households/*" element={<HouseholdsRoutes />} />
                <Route path="/tags" element={<TagsPage />} />
                <Route path="/settings/profile-fields" element={<ProfileFieldsPage />} />
              </Routes>
            </AppLayout>
          </Router>
        </AuthProvider>
      </ConfigProvider>
    </Monetization>
  );
}

export default App;
import React, { useState } from 'react';
import { Layout } from 'antd';
import Header from './Header';
import Sidebar from './Sidebar';
import { useBreakpoint } from '../../hooks/useBreakpoint';

const { Content } = Layout;

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const breakpoint = useBreakpoint();
  const isMobile = ['xs', 'sm'].includes(breakpoint);

  return (
    <Layout className="min-h-screen">
      <Header onMenuClick={() => setMobileMenuOpen(true)} />
      <Layout>
        <Sidebar 
          mobileOpen={mobileMenuOpen} 
          onMobileClose={() => setMobileMenuOpen(false)} 
        />
        <Content className={`p-4 sm:p-6 bg-gray-50 overflow-auto ${isMobile ? 'w-full' : ''}`}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
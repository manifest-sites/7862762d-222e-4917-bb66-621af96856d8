import React, { useState, useEffect } from 'react';
import { Layout, Menu, Drawer } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  HomeOutlined,
  TagOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';

const { Sider } = Layout;

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onMobileClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useAuth();
  const breakpoint = useBreakpoint();
  const isMobile = ['xs', 'sm'].includes(breakpoint);

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/people',
      icon: <TeamOutlined />,
      label: 'People',
    },
    {
      key: '/households',
      icon: <HomeOutlined />,
      label: 'Households',
    },
    {
      key: '/tags',
      icon: <TagOutlined />,
      label: 'Tags',
    },
    ...(userRole === 'admin' || userRole === 'owner' ? [{
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      children: [
        {
          key: '/settings/profile-fields',
          label: 'Profile Fields',
        },
      ],
    }] : []),
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  };

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/settings')) return '/settings/profile-fields';
    return path;
  };

  const getOpenKeys = () => {
    if (location.pathname.startsWith('/settings')) {
      return ['/settings'];
    }
    return [];
  };

  const menuComponent = (
    <Menu
      mode="inline"
      selectedKeys={[getSelectedKey()]}
      defaultOpenKeys={getOpenKeys()}
      items={menuItems}
      onClick={handleMenuClick}
      className="border-none h-full"
    />
  );

  if (isMobile) {
    return (
      <Drawer
        title="Navigation"
        placement="left"
        width={240}
        onClose={onMobileClose}
        open={mobileOpen}
        bodyStyle={{ padding: 0 }}
      >
        {menuComponent}
      </Drawer>
    );
  }

  return (
    <Sider width={240} className="bg-white shadow-sm border-r">
      {menuComponent}
    </Sider>
  );
};

export default Sidebar;
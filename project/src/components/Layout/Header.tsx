import React, { useState } from 'react';
import { Layout, Select, Typography, Avatar, Dropdown, Button } from 'antd';
import type { MenuProps } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';

const { Header: AntHeader } = Layout;
const { Title } = Typography;

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, organizationId, organizations } = useAuth();
  const breakpoint = useBreakpoint();
  const isMobile = ['xs', 'sm'].includes(breakpoint);
  const currentOrg = organizations.find(org => org._id === organizationId);

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: 'Profile',
    },
    {
      key: 'logout',
      label: 'Logout',
    },
  ];

  const handleOrgChange = (value: string) => {
    // In real app, this would update the current organization
    console.log('Switching to org:', value);
  };

  return (
    <AntHeader className="bg-white shadow-sm border-b px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center space-x-2 sm:space-x-4">
        {isMobile && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={onMenuClick}
            className="mr-2"
          />
        )}
        <Title level={4} className="!mb-0 text-blue-600 hidden sm:block">
          Church CRM
        </Title>
        <Title level={5} className="!mb-0 text-blue-600 sm:hidden">
          CRM
        </Title>
        {!isMobile && (
          <Select
            value={organizationId}
            onChange={handleOrgChange}
            className="min-w-[200px]"
            placeholder="Select Organization"
          >
            {organizations.map(org => (
              <Select.Option key={org._id} value={org._id}>
                {org.name}
              </Select.Option>
            ))}
          </Select>
        )}
      </div>
      
      <div className="flex items-center space-x-2 sm:space-x-4">
        {!isMobile && <span className="text-gray-600">{currentOrg?.name}</span>}
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
            <Avatar src={user?.imageUrl} size="small">
              {user?.name?.charAt(0)}
            </Avatar>
            {!isMobile && <span className="text-gray-700">{user?.name}</span>}
          </div>
        </Dropdown>
      </div>
    </AntHeader>
  );
};

export default Header;
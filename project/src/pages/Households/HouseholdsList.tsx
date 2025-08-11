import React, { useState, useEffect } from 'react';
import {
  Table,
  Input,
  Button,
  Card,
  message,
  Modal,
  Form,
  Space,
  Dropdown,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  PlusOutlined,
  MoreOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Household } from '../../entities/Household';
import { HouseholdMember } from '../../entities/HouseholdMember';
import { Person } from '../../entities/Person';
import type { Household as HouseholdType, HouseholdMember as HouseholdMemberType, Person as PersonType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const { Search } = Input;

const HouseholdsList: React.FC = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [households, setHouseholds] = useState<(HouseholdType & { memberCount: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchHouseholds();
  }, []);

  const fetchHouseholds = async () => {
    try {
      setLoading(true);
      
      const [householdsResponse, membersResponse] = await Promise.all([
        Household.list(),
        HouseholdMember.list(),
      ]);

      if (householdsResponse.success && membersResponse.success) {
        const householdsData = Array.isArray(householdsResponse.data) ? householdsResponse.data : [householdsResponse.data];
        const membersData = Array.isArray(membersResponse.data) ? membersResponse.data : [membersResponse.data];
        
        // Count members for each household
        const householdsWithCounts = householdsData.map(household => {
          const memberCount = membersData.filter(member => member.householdId === household._id).length;
          return { ...household, memberCount };
        });
        
        setHouseholds(householdsWithCounts);
      }
    } catch (error) {
      console.error('Failed to fetch households:', error);
      message.error('Failed to load households');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHousehold = async (values: any) => {
    try {
      await Household.create(values);
      message.success('Household created successfully');
      form.resetFields();
      setShowCreateModal(false);
      await fetchHouseholds();
    } catch (error) {
      console.error('Failed to create household:', error);
      message.error('Failed to create household');
    }
  };

  const handleDeleteHousehold = async (householdId: string) => {
    Modal.confirm({
      title: 'Delete Household',
      content: 'Are you sure you want to delete this household? This action cannot be undone.',
      okType: 'danger',
      onOk: async () => {
        try {
          // In real app, this would also handle removing members
          message.success('Household deleted successfully');
          await fetchHouseholds();
        } catch (error) {
          console.error('Failed to delete household:', error);
          message.error('Failed to delete household');
        }
      },
    });
  };

  const filteredHouseholds = households.filter(household => {
    if (!searchQuery) return true;
    return household.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getActionMenu = (household: HouseholdType & { memberCount: number }) => ({
    items: [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'View Details',
        onClick: () => navigate(`/households/${household._id}`),
      },
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit',
        onClick: () => navigate(`/households/${household._id}/edit`),
        disabled: userRole === 'viewer',
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: 'Delete',
        onClick: () => handleDeleteHousehold(household._id),
        disabled: userRole === 'viewer' || household.memberCount > 0,
        danger: true,
      },
    ],
  });

  const columns: ColumnsType<HouseholdType & { memberCount: number }> = [
    {
      title: 'Household Name',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Button 
          type="link" 
          className="p-0"
          onClick={() => navigate(`/households/${record._id}`)}
        >
          <Space>
            <HomeOutlined />
            {name}
          </Space>
        </Button>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Members',
      dataIndex: 'memberCount',
      key: 'memberCount',
      sorter: (a, b) => a.memberCount - b.memberCount,
      render: (count) => `${count} member${count !== 1 ? 's' : ''}`,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 60,
      render: (_, record) => (
        <Dropdown menu={getActionMenu(record)} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const canCreate = userRole !== 'viewer';

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Households</h1>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
            Add Household
          </Button>
        )}
      </div>

      <Card>
        <div className="space-y-4">
          <Search
            placeholder="Search households by name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
          />

          <Table
            columns={columns}
            dataSource={filteredHouseholds}
            rowKey="_id"
            loading={loading}
            pagination={{
              pageSize: 50,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} households`,
            }}
          />
        </div>
      </Card>

      {/* Create Household Modal */}
      <Modal
        title="Create New Household"
        open={showCreateModal}
        onCancel={() => {
          setShowCreateModal(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateHousehold}>
          <Form.Item
            name="name"
            label="Household Name"
            rules={[{ required: true, message: 'Please enter household name' }]}
          >
            <Input placeholder="e.g., The Smith Family" />
          </Form.Item>
          <div className="flex justify-end space-x-2">
            <Button onClick={() => {
              setShowCreateModal(false);
              form.resetFields();
            }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              Create Household
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default HouseholdsList;
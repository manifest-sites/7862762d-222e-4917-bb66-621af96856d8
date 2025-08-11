import React, { useState, useEffect } from 'react';
import {
  Table,
  Input,
  Button,
  Select,
  Space,
  Tag,
  Dropdown,
  Checkbox,
  Card,
  message,
  Modal,
} from 'antd';
import type { ColumnsType, TableRowSelection } from 'antd/es/table';
import {
  SearchOutlined,
  PlusOutlined,
  FilterOutlined,
  MoreOutlined,
  EditOutlined,
  EyeOutlined,
  StopOutlined,
  ImportOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Person } from '../../entities/Person';
import { Tag as TagEntity } from '../../entities/Tag';
import { ProfileFieldDef } from '../../entities/ProfileFieldDef';
import type { Person as PersonType, Tag as TagType, ProfileFieldDef as ProfileFieldDefType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import CSVImport from '../../components/ImportExport/CSVImport';
import CSVExport from '../../components/ImportExport/CSVExport';

const { Search } = Input;
const { Option } = Select;

interface PeopleFilters {
  status?: string;
  tagIds?: string[];
  [key: string]: any;
}

const PeopleList: React.FC = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [people, setPeople] = useState<PersonType[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [profileFields, setProfileFields] = useState<ProfileFieldDefType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<PeopleFilters>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name', 'email', 'phone', 'status', 'tags', 'household'
  ]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [peopleResponse, tagsResponse, fieldsResponse] = await Promise.all([
        Person.list(),
        TagEntity.list(),
        ProfileFieldDef.list(),
      ]);

      if (peopleResponse.success) {
        const peopleData = Array.isArray(peopleResponse.data) ? peopleResponse.data : [peopleResponse.data];
        setPeople(peopleData);
      }

      if (tagsResponse.success) {
        const tagsData = Array.isArray(tagsResponse.data) ? tagsResponse.data : [tagsResponse.data];
        setTags(tagsData);
      }

      if (fieldsResponse.success) {
        const fieldsData = Array.isArray(fieldsResponse.data) ? fieldsResponse.data : [fieldsResponse.data];
        setProfileFields(fieldsData.filter(field => !field.archived).sort((a, b) => a.orderIndex - b.orderIndex));
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      message.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredPeople = people.filter(person => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        person.firstName.toLowerCase().includes(query) ||
        person.lastName.toLowerCase().includes(query) ||
        person.preferredName?.toLowerCase().includes(query) ||
        person.email?.toLowerCase().includes(query) ||
        person.phone?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filters.status && person.status !== filters.status) {
      return false;
    }

    // Tags filter
    if (filters.tagIds && filters.tagIds.length > 0) {
      const hasMatchingTag = filters.tagIds.some(tagId => person.tagIds.includes(tagId));
      if (!hasMatchingTag) return false;
    }

    // Dynamic field filters
    for (const [key, value] of Object.entries(filters)) {
      if (key !== 'status' && key !== 'tagIds' && value !== undefined && value !== '') {
        if (person.fields[key] !== value) {
          return false;
        }
      }
    }

    return true;
  });

  const getPersonName = (person: PersonType) => {
    return person.preferredName || `${person.firstName} ${person.lastName}`;
  };

  const getPersonTags = (tagIds: string[]) => {
    return tags.filter(tag => tagIds?.includes(tag._id));
  };

  const handleStatusChange = async (personId: string, newStatus: string) => {
    try {
      await Person.update(personId, { status: newStatus });
      await fetchData();
      message.success('Status updated successfully');
    } catch (error) {
      console.error('Failed to update status:', error);
      message.error('Failed to update status');
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    try {
      await Promise.all(
        selectedRowKeys.map(key => Person.update(key as string, { status: newStatus }))
      );
      await fetchData();
      setSelectedRowKeys([]);
      message.success('Status updated for selected people');
    } catch (error) {
      console.error('Failed to bulk update status:', error);
      message.error('Failed to update status');
    }
  };

  const getActionMenu = (person: PersonType) => ({
    items: [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'View Profile',
        onClick: () => navigate(`/people/${person._id}`),
      },
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit',
        onClick: () => navigate(`/people/${person._id}/edit`),
        disabled: userRole === 'viewer',
      },
      {
        key: 'inactivate',
        icon: <StopOutlined />,
        label: 'Set Inactive',
        onClick: () => handleStatusChange(person._id, 'inactive'),
        disabled: userRole === 'viewer' || person.status === 'inactive',
      },
    ],
  });

  const baseColumns: ColumnsType<PersonType> = [
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => (
        <Button 
          type="link" 
          className="p-0"
          onClick={() => navigate(`/people/${record._id}`)}
        >
          {getPersonName(record)}
        </Button>
      ),
      sorter: (a, b) => getPersonName(a).localeCompare(getPersonName(b)),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => email || '-',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => phone || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={
          status === 'active' ? 'green' : 
          status === 'inactive' ? 'red' : 
          'orange'
        }>
          {status.toUpperCase()}
        </Tag>
      ),
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Inactive', value: 'inactive' },
        { text: 'Visitor', value: 'visitor' },
      ],
    },
    {
      title: 'Tags',
      key: 'tags',
      render: (_, record) => (
        <Space wrap>
          {getPersonTags(record.tagIds).map(tag => (
            <Tag key={tag._id} color={tag.color || 'blue'}>
              {tag.name}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Household',
      key: 'household',
      render: (_, record) => record.householdId ? (
        <Button 
          type="link" 
          className="p-0"
          onClick={() => navigate(`/households/${record.householdId}`)}
        >
          View Household
        </Button>
      ) : '-',
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

  // Add dynamic columns for profile fields
  const dynamicColumns: ColumnsType<PersonType> = profileFields
    .filter(field => visibleColumns.includes(field.key))
    .map(field => ({
      title: field.label,
      key: field.key,
      render: (_, record) => {
        const value = record.fields[field.key];
        if (value === undefined || value === null) return '-';
        
        if (field.type === 'checkbox') {
          return value ? 'Yes' : 'No';
        } else if (field.type === 'multiselect') {
          return Array.isArray(value) ? value.join(', ') : value;
        }
        
        return value.toString();
      },
    }));

  const allColumns = baseColumns.concat(dynamicColumns);
  const visibleColumnsData = allColumns.filter(col => 
    visibleColumns.includes(col.key as string) || col.key === 'actions'
  );

  const rowSelection: TableRowSelection<PersonType> = {
    selectedRowKeys,
    onChange: (selectedKeys) => setSelectedRowKeys(selectedKeys),
    getCheckboxProps: () => ({ disabled: userRole === 'viewer' }),
  };

  const bulkActionMenu = {
    items: [
      {
        key: 'bulk-active',
        label: 'Set Active',
        onClick: () => handleBulkStatusChange('active'),
      },
      {
        key: 'bulk-inactive',
        label: 'Set Inactive',
        onClick: () => handleBulkStatusChange('inactive'),
      },
      {
        key: 'bulk-visitor',
        label: 'Set Visitor',
        onClick: () => handleBulkStatusChange('visitor'),
      },
    ],
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">People</h1>
        <Space>
          {userRole !== 'viewer' && (
            <>
              <Button icon={<ImportOutlined />} onClick={() => setShowImportModal(true)}>
                Import CSV
              </Button>
              <Button icon={<ExportOutlined />} onClick={() => setShowExportModal(true)}>
                Export CSV
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/people/new')}>
                Add Person
              </Button>
            </>
          )}
          {userRole === 'viewer' && (
            <Button icon={<ExportOutlined />} onClick={() => setShowExportModal(true)}>
              Export CSV
            </Button>
          )}
        </Space>
      </div>

      <Card>
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-wrap gap-4">
            <Search
              placeholder="Search by name, email, or phone"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 300 }}
              prefix={<SearchOutlined />}
            />
            
            <Select
              placeholder="Filter by status"
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
              style={{ width: 150 }}
              allowClear
            >
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
              <Option value="visitor">Visitor</Option>
            </Select>

            <Select
              mode="multiple"
              placeholder="Filter by tags"
              value={filters.tagIds}
              onChange={(value) => setFilters({ ...filters, tagIds: value })}
              style={{ width: 200 }}
            >
              {tags.map(tag => (
                <Option key={tag._id} value={tag._id}>{tag.name}</Option>
              ))}
            </Select>
          </div>

          {/* Column Visibility */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Visible columns:</span>
            {['name', 'email', 'phone', 'status', 'tags', 'household'].concat(
              profileFields.map(f => f.key)
            ).map(key => (
              <Checkbox
                key={key}
                checked={visibleColumns.includes(key)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setVisibleColumns([...visibleColumns, key]);
                  } else {
                    setVisibleColumns(visibleColumns.filter(col => col !== key));
                  }
                }}
              >
                {profileFields.find(f => f.key === key)?.label || 
                 key.charAt(0).toUpperCase() + key.slice(1)}
              </Checkbox>
            ))}
          </div>

          {/* Bulk Actions */}
          {selectedRowKeys.length > 0 && userRole !== 'viewer' && (
            <div className="flex items-center space-x-2">
              <span>{selectedRowKeys.length} selected</span>
              <Dropdown menu={bulkActionMenu}>
                <Button>Bulk Actions</Button>
              </Dropdown>
            </div>
          )}

          {/* Table */}
          <Table
            columns={visibleColumnsData}
            dataSource={filteredPeople}
            rowKey="_id"
            loading={loading}
            rowSelection={userRole !== 'viewer' ? rowSelection : undefined}
            pagination={{
              pageSize: 50,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} people`,
            }}
            scroll={{ x: true }}
          />
        </div>
      </Card>

      {/* Import/Export Modals */}
      <CSVImport
        visible={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={fetchData}
      />
      
      <CSVExport
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        people={filteredPeople}
        profileFields={profileFields}
        tags={tags}
        currentFilters={filters}
      />
    </div>
  );
};

export default PeopleList;
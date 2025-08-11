import React, { useState } from 'react';
import {
  Modal,
  Checkbox,
  Button,
  message,
  Typography,
  Card,
  Row,
  Col,
  Space,
} from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { Person as PersonType, ProfileFieldDef as ProfileFieldDefType, Tag as TagType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;

interface CSVExportProps {
  visible: boolean;
  onClose: () => void;
  people: PersonType[];
  profileFields: ProfileFieldDefType[];
  tags: TagType[];
  currentFilters?: any;
}

const CSVExport: React.FC<CSVExportProps> = ({ 
  visible, 
  onClose, 
  people, 
  profileFields, 
  tags,
  currentFilters 
}) => {
  const { userRole } = useAuth();
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'firstName',
    'lastName',
    'email',
    'phone',
    'status',
  ]);
  const [exporting, setExporting] = useState(false);

  const coreColumns = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'preferredName', label: 'Preferred Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'status', label: 'Status' },
    { key: 'tags', label: 'Tags' },
    { key: 'household', label: 'Household' },
    { key: 'createdAt', label: 'Created Date' },
    { key: 'updatedAt', label: 'Updated Date' },
  ];

  const visibleProfileFields = profileFields.filter(field => 
    field.visibility === 'public' || userRole === 'admin' || userRole === 'owner'
  );

  const handleColumnToggle = (columnKey: string, checked: boolean) => {
    if (checked) {
      setSelectedColumns([...selectedColumns, columnKey]);
    } else {
      setSelectedColumns(selectedColumns.filter(key => key !== columnKey));
    }
  };

  const formatCellValue = (person: PersonType, columnKey: string) => {
    switch (columnKey) {
      case 'firstName':
      case 'lastName':
      case 'preferredName':
      case 'email':
      case 'phone':
      case 'status':
        return person[columnKey as keyof PersonType] || '';
      
      case 'tags':
        const personTags = tags.filter(tag => person.tagIds.includes(tag._id));
        return personTags.map(tag => tag.name).join('; ');
      
      case 'household':
        return person.householdId ? 'Yes' : 'No';
      
      case 'createdAt':
      case 'updatedAt':
        return new Date(person[columnKey as keyof PersonType] as string).toLocaleDateString();
      
      default:
        // Dynamic field
        const value = person.fields[columnKey];
        if (value === undefined || value === null) return '';
        
        if (Array.isArray(value)) {
          return value.join('; ');
        }
        
        if (typeof value === 'boolean') {
          return value ? 'Yes' : 'No';
        }
        
        return value.toString();
    }
  };

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      message.warning('Please select at least one column to export');
      return;
    }

    setExporting(true);
    try {
      // Create CSV header
      const headers = selectedColumns.map(key => {
        const coreColumn = coreColumns.find(col => col.key === key);
        if (coreColumn) return coreColumn.label;
        
        const profileField = profileFields.find(field => field.key === key);
        return profileField?.label || key;
      });

      // Create CSV rows
      const rows = people.map(person => 
        selectedColumns.map(key => {
          const value = formatCellValue(person, key);
          // Escape quotes and wrap in quotes if contains comma
          return value.includes(',') || value.includes('"') ? 
            `"${value.replace(/"/g, '""')}"` : value;
        })
      );

      // Combine header and rows
      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `people-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      message.success(`Exported ${people.length} people to CSV`);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      message.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      title="Export People to CSV"
      open={visible}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            type="primary" 
            icon={<DownloadOutlined />}
            onClick={handleExport}
            loading={exporting}
            disabled={selectedColumns.length === 0}
          >
            Export CSV ({people.length} people)
          </Button>
        </Space>
      }
      width={700}
    >
      <div className="space-y-4">
        <div>
          <Text type="secondary">
            Select the columns you want to include in the export. 
            {currentFilters && ' Current filters will be applied.'}
          </Text>
        </div>

        <Card title="Core Fields" size="small">
          <Row gutter={[16, 8]}>
            {coreColumns.map(column => (
              <Col key={column.key} span={12}>
                <Checkbox
                  checked={selectedColumns.includes(column.key)}
                  onChange={(e) => handleColumnToggle(column.key, e.target.checked)}
                >
                  {column.label}
                </Checkbox>
              </Col>
            ))}
          </Row>
        </Card>

        {visibleProfileFields.length > 0 && (
          <Card title="Custom Fields" size="small">
            <Row gutter={[16, 8]}>
              {visibleProfileFields.map(field => (
                <Col key={field.key} span={12}>
                  <Checkbox
                    checked={selectedColumns.includes(field.key)}
                    onChange={(e) => handleColumnToggle(field.key, e.target.checked)}
                  >
                    {field.label}
                    {field.visibility === 'staff_only' && (
                      <Text type="secondary" className="text-xs ml-1">(Staff Only)</Text>
                    )}
                  </Checkbox>
                </Col>
              ))}
            </Row>
          </Card>
        )}

        <div className="bg-gray-50 p-3 rounded">
          <Text strong>Export Summary:</Text>
          <ul className="mb-0 mt-2">
            <li>Number of people: {people.length}</li>
            <li>Selected columns: {selectedColumns.length}</li>
            <li>File format: CSV</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};

export default CSVExport;
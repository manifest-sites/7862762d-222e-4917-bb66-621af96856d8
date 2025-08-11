import React, { useState } from 'react';
import {
  Modal,
  Steps,
  Upload,
  Button,
  Table,
  Select,
  message,
  Typography,
  Alert,
  Space,
  Card,
} from 'antd';
import { InboxOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Person } from '../../entities/Person';
import { ProfileFieldDef } from '../../entities/ProfileFieldDef';
import type { ProfileFieldDef as ProfileFieldDefType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { Option } = Select;

interface CSVImportProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CSVRow {
  [key: string]: string;
}

interface MappingConfig {
  [csvColumn: string]: string | null;
}

const CSVImport: React.FC<CSVImportProps> = ({ visible, onClose, onSuccess }) => {
  const { userRole } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<MappingConfig>({});
  const [profileFields, setProfileFields] = useState<ProfileFieldDefType[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const coreFields = [
    { key: 'firstName', label: 'First Name', required: true },
    { key: 'lastName', label: 'Last Name', required: true },
    { key: 'preferredName', label: 'Preferred Name', required: false },
    { key: 'email', label: 'Email', required: false },
    { key: 'phone', label: 'Phone', required: false },
    { key: 'status', label: 'Status', required: true },
  ];

  const handleFileUpload = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        message.error('CSV file must have at least a header row and one data row');
        return false;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row: CSVRow = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      setCsvHeaders(headers);
      setCsvData(data);
      setCurrentStep(1);

      // Fetch profile fields for mapping
      const fieldsResponse = await ProfileFieldDef.list();
      if (fieldsResponse.success) {
        const fieldsData = Array.isArray(fieldsResponse.data) ? fieldsResponse.data : [fieldsResponse.data];
        setProfileFields(fieldsData.filter(field => !field.archived));
      }

      // Auto-map common column names
      const autoMapping: MappingConfig = {};
      headers.forEach(header => {
        const lowerHeader = header.toLowerCase();
        
        if (lowerHeader.includes('first') && lowerHeader.includes('name')) {
          autoMapping[header] = 'firstName';
        } else if (lowerHeader.includes('last') && lowerHeader.includes('name')) {
          autoMapping[header] = 'lastName';
        } else if (lowerHeader.includes('email')) {
          autoMapping[header] = 'email';
        } else if (lowerHeader.includes('phone')) {
          autoMapping[header] = 'phone';
        } else if (lowerHeader.includes('status')) {
          autoMapping[header] = 'status';
        }
      });
      setMapping(autoMapping);

    } catch (error) {
      message.error('Failed to parse CSV file');
    }
    return false; // Prevent default upload
  };

  const validateMapping = () => {
    const errors: string[] = [];
    const mappedFields = Object.values(mapping).filter(Boolean);
    
    // Check required core fields
    const requiredFields = coreFields.filter(f => f.required);
    requiredFields.forEach(field => {
      if (!mappedFields.includes(field.key)) {
        errors.push(`Required field "${field.label}" is not mapped`);
      }
    });

    // Validate data
    csvData.slice(0, 5).forEach((row, index) => {
      Object.entries(mapping).forEach(([csvCol, targetField]) => {
        if (!targetField) return;
        
        const value = row[csvCol];
        if (targetField === 'status' && !['active', 'inactive', 'visitor'].includes(value.toLowerCase())) {
          errors.push(`Row ${index + 1}: Invalid status "${value}". Must be active, inactive, or visitor`);
        }
        if (targetField === 'email' && value && !value.includes('@')) {
          errors.push(`Row ${index + 1}: Invalid email "${value}"`);
        }
      });
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleImport = async () => {
    if (!validateMapping()) {
      message.error('Please fix validation errors before importing');
      return;
    }

    setImporting(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const row of csvData) {
        try {
          const personData: any = {
            status: 'active', // default
            fields: {},
          };

          // Map core fields
          Object.entries(mapping).forEach(([csvCol, targetField]) => {
            if (!targetField) return;
            
            const value = row[csvCol];
            if (coreFields.some(f => f.key === targetField)) {
              personData[targetField] = value;
            } else {
              // Dynamic field
              personData.fields[targetField] = value;
            }
          });

          await Person.create(personData);
          successCount++;
        } catch (error) {
          console.error('Failed to import row:', row, error);
          errorCount++;
        }
      }

      message.success(`Import completed: ${successCount} people imported, ${errorCount} errors`);
      onSuccess();
      handleClose();
    } catch (error) {
      message.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    setCsvData([]);
    setCsvHeaders([]);
    setMapping({});
    setValidationErrors([]);
    onClose();
  };

  const previewColumns: ColumnsType<CSVRow> = csvHeaders.map(header => ({
    title: (
      <div>
        <div>{header}</div>
        <Select
          size="small"
          placeholder="Map to field"
          value={mapping[header]}
          onChange={(value) => setMapping({ ...mapping, [header]: value })}
          style={{ width: '100%' }}
          allowClear
        >
          <Option value="" disabled>Core Fields</Option>
          {coreFields.map(field => (
            <Option key={field.key} value={field.key}>
              {field.label} {field.required && '*'}
            </Option>
          ))}
          {profileFields.length > 0 && <Option value="" disabled>Custom Fields</Option>}
          {profileFields.map(field => (
            <Option key={field.key} value={field.key}>
              {field.label}
            </Option>
          ))}
        </Select>
      </div>
    ),
    dataIndex: header,
    key: header,
    width: 200,
    render: (text) => text || '-',
  }));

  const steps = [
    {
      title: 'Upload CSV',
      content: (
        <div className="space-y-4">
          <Alert
            message="CSV Import Instructions"
            description="Upload a CSV file with person data. The first row should contain column headers."
            type="info"
            showIcon
          />
          <Dragger
            beforeUpload={handleFileUpload}
            showUploadList={false}
            accept=".csv"
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drag CSV file to this area to upload</p>
            <p className="ant-upload-hint">
              Supports .csv files only. First row should contain column headers.
            </p>
          </Dragger>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => {
              // Create sample CSV
              const sampleCSV = 'First Name,Last Name,Email,Phone,Status\nJohn,Doe,john@example.com,(555) 123-4567,active\nJane,Smith,jane@example.com,(555) 987-6543,visitor';
              const blob = new Blob([sampleCSV], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'sample-import.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download Sample CSV
          </Button>
        </div>
      ),
    },
    {
      title: 'Map Columns',
      content: (
        <div className="space-y-4">
          <Alert
            message="Column Mapping"
            description="Map CSV columns to person fields. Required fields must be mapped."
            type="info"
            showIcon
          />
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <Table
              columns={previewColumns}
              dataSource={csvData.slice(0, 5)}
              pagination={false}
              scroll={{ x: true }}
              size="small"
            />
          </div>
          <Text type="secondary">
            Showing first 5 rows. Total rows: {csvData.length}
          </Text>
        </div>
      ),
    },
    {
      title: 'Validate & Import',
      content: (
        <div className="space-y-4">
          {validationErrors.length > 0 ? (
            <Alert
              message="Validation Errors"
              description={
                <ul className="mb-0">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              }
              type="error"
              showIcon
            />
          ) : (
            <Alert
              message="Ready to Import"
              description={`${csvData.length} people will be imported.`}
              type="success"
              showIcon
            />
          )}
        </div>
      ),
    },
  ];

  if (userRole === 'viewer') {
    return null;
  }

  return (
    <Modal
      title="Import People from CSV"
      open={visible}
      onCancel={handleClose}
      footer={
        <Space>
          <Button onClick={handleClose}>Cancel</Button>
          {currentStep > 0 && (
            <Button onClick={() => setCurrentStep(currentStep - 1)}>
              Previous
            </Button>
          )}
          {currentStep < steps.length - 1 && (
            <Button 
              type="primary" 
              onClick={() => {
                if (currentStep === 1) {
                  validateMapping();
                }
                setCurrentStep(currentStep + 1);
              }}
              disabled={currentStep === 0 && csvData.length === 0}
            >
              Next
            </Button>
          )}
          {currentStep === steps.length - 1 && (
            <Button 
              type="primary" 
              onClick={handleImport}
              loading={importing}
              disabled={validationErrors.length > 0}
            >
              Import People
            </Button>
          )}
        </Space>
      }
      width={800}
    >
      <Steps current={currentStep} className="mb-6">
        {steps.map(step => (
          <Steps.Step key={step.title} title={step.title} />
        ))}
      </Steps>
      {steps[currentStep].content}
    </Modal>
  );
};

export default CSVImport;
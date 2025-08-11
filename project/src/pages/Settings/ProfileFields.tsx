import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Space,
  Tag,
  Popconfirm,
  Typography,
  Row,
  Col,
  Divider,
  InputNumber,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DragOutlined,
  EyeOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { ProfileFieldDef } from '../../entities/ProfileFieldDef';
import type { ProfileFieldDef as ProfileFieldDefType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const ProfileFieldsPage: React.FC = () => {
  const { userRole } = useAuth();
  const [fields, setFields] = useState<ProfileFieldDefType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [editingField, setEditingField] = useState<ProfileFieldDefType | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      setLoading(true);
      
      const response = await ProfileFieldDef.list();
      if (response.success) {
        const fieldsData = Array.isArray(response.data) ? response.data : [response.data];
        setFields(fieldsData.sort((a, b) => a.orderIndex - b.orderIndex));
      }
    } catch (error) {
      console.error('Failed to fetch profile fields:', error);
      message.error('Failed to load profile fields');
    } finally {
      setLoading(false);
    }
  };

  const generateKey = (label: string) => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const handleCreateField = async (values: any) => {
    try {
      const key = values.key || generateKey(values.label);
      const maxOrder = Math.max(...fields.map(f => f.orderIndex), 0);
      
      const fieldData = {
        ...values,
        key,
        orderIndex: maxOrder + 1,
        archived: false,
      };
      
      await ProfileFieldDef.create(fieldData);
      message.success('Profile field created successfully');
      form.resetFields();
      setShowCreateModal(false);
      await fetchFields();
    } catch (error) {
      console.error('Failed to create profile field:', error);
      message.error('Failed to create profile field');
    }
  };

  const handleEditField = async (values: any) => {
    if (!editingField) return;

    try {
      await ProfileFieldDef.update(editingField._id, values);
      message.success('Profile field updated successfully');
      form.resetFields();
      setShowEditModal(false);
      setEditingField(null);
      await fetchFields();
    } catch (error) {
      console.error('Failed to update profile field:', error);
      message.error('Failed to update profile field');
    }
  };

  const handleArchiveField = async (fieldId: string) => {
    try {
      await ProfileFieldDef.update(fieldId, { archived: true });
      message.success('Profile field archived successfully');
      await fetchFields();
    } catch (error) {
      console.error('Failed to archive profile field:', error);
      message.error('Failed to archive profile field');
    }
  };

  const handleReorder = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order indexes
    const updatedItems = items.map((item, index) => ({
      ...item,
      orderIndex: index + 1,
    }));

    setFields(updatedItems);

    try {
      // In real app, you'd batch update the orderIndex values
      await Promise.all(
        updatedItems.map(item => 
          ProfileFieldDef.update(item._id, { orderIndex: item.orderIndex })
        )
      );
      message.success('Field order updated successfully');
    } catch (error) {
      console.error('Failed to update field order:', error);
      message.error('Failed to update field order');
      // Revert on error
      await fetchFields();
    }
  };

  const openEditModal = (field: ProfileFieldDefType) => {
    setEditingField(field);
    form.setFieldsValue({
      ...field,
      options: field.options || [],
    });
    setShowEditModal(true);
  };

  const renderPreviewField = (field: ProfileFieldDefType) => {
    const commonProps = {
      disabled: true,
      placeholder: `Sample ${field.label.toLowerCase()}`,
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return <Input {...commonProps} />;
      case 'textarea':
        return <TextArea {...commonProps} rows={3} />;
      case 'number':
        return <InputNumber {...commonProps} className="w-full" />;
      case 'checkbox':
        return <Switch disabled defaultChecked />;
      case 'select':
        return (
          <Select {...commonProps}>
            {field.options?.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        );
      case 'multiselect':
        return (
          <Select {...commonProps} mode="multiple">
            {field.options?.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        );
      default:
        return <Input {...commonProps} />;
    }
  };

  const getFieldTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      text: 'blue',
      textarea: 'cyan',
      number: 'green',
      date: 'orange',
      checkbox: 'purple',
      select: 'magenta',
      multiselect: 'red',
      email: 'geekblue',
      phone: 'lime',
      url: 'gold',
    };
    return colors[type] || 'default';
  };

  const activeFields = fields.filter(field => !field.archived);
  const canEdit = userRole === 'admin' || userRole === 'owner';

  if (userRole === 'viewer' || userRole === 'member') {
    return (
      <div className="text-center py-12">
        <Title level={3}>Access Denied</Title>
        <Text type="secondary">You don't have permission to manage profile fields.</Text>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title level={2} className="mb-0">Profile Fields</Title>
          <Text type="secondary">Configure custom fields for people profiles</Text>
        </div>
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => setShowPreviewModal(true)}>
            Preview Form
          </Button>
          {canEdit && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
              Add Field
            </Button>
          )}
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="Profile Fields" extra={<Text type="secondary">Drag to reorder</Text>}>
            <DragDropContext onDragEnd={handleReorder}>
              <Droppable droppableId="fields">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    <List
                      loading={loading}
                      dataSource={activeFields}
                      renderItem={(field, index) => (
                        <Draggable key={field._id} draggableId={field._id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`${snapshot.isDragging ? 'bg-gray-50 shadow-lg' : ''}`}
                            >
                              <List.Item
                                actions={canEdit ? [
                                  <Button
                                    type="text"
                                    icon={<EditOutlined />}
                                    onClick={() => openEditModal(field)}
                                    title="Edit field"
                                  />,
                                  <Popconfirm
                                    title="Archive this field? It will be hidden from forms but existing data will be preserved."
                                    onConfirm={() => handleArchiveField(field._id)}
                                    okText="Archive"
                                    cancelText="Cancel"
                                  >
                                    <Button
                                      type="text"
                                      icon={<DeleteOutlined />}
                                      danger
                                      title="Archive field"
                                    />
                                  </Popconfirm>
                                ] : []}
                              >
                                <List.Item.Meta
                                  avatar={
                                    <div className="flex items-center space-x-2">
                                      <div {...provided.dragHandleProps}>
                                        <DragOutlined className="text-gray-400 cursor-grab" />
                                      </div>
                                      <Tag color={getFieldTypeColor(field.type)}>
                                        {field.type}
                                      </Tag>
                                    </div>
                                  }
                                  title={
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium">{field.label}</span>
                                      {field.required && <Tag color="red" size="small">Required</Tag>}
                                      {field.visibility === 'staff_only' && (
                                        <Tag color="orange" size="small">Staff Only</Tag>
                                      )}
                                    </div>
                                  }
                                  description={
                                    <div className="space-y-1">
                                      <div>
                                        <Text type="secondary">Key: </Text>
                                        <Text code>{field.key}</Text>
                                      </div>
                                      {field.options && field.options.length > 0 && (
                                        <div>
                                          <Text type="secondary">Options: </Text>
                                          <Space wrap>
                                            {field.options.map(option => (
                                              <Tag key={option.value} size="small">
                                                {option.label}
                                              </Tag>
                                            ))}
                                          </Space>
                                        </div>
                                      )}
                                    </div>
                                  }
                                />
                              </List.Item>
                            </div>
                          )}
                        </Draggable>
                      )}
                      locale={{ emptyText: 'No profile fields created yet' }}
                    />
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </Card>
        </Col>
      </Row>

      {/* Create Field Modal */}
      <Modal
        title="Create Profile Field"
        open={showCreateModal}
        onCancel={() => {
          setShowCreateModal(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateField}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="label"
                label="Field Label"
                rules={[{ required: true, message: 'Please enter field label' }]}
              >
                <Input placeholder="e.g., Date of Birth" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="key"
                label="Field Key"
                tooltip="Auto-generated from label if not specified"
              >
                <Input placeholder="e.g., date_of_birth" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="type"
            label="Field Type"
            rules={[{ required: true, message: 'Please select field type' }]}
          >
            <Select placeholder="Select field type">
              <Option value="text">Text</Option>
              <Option value="textarea">Textarea</Option>
              <Option value="number">Number</Option>
              <Option value="date">Date</Option>
              <Option value="checkbox">Checkbox</Option>
              <Option value="select">Select (Single)</Option>
              <Option value="multiselect">Select (Multiple)</Option>
              <Option value="email">Email</Option>
              <Option value="phone">Phone</Option>
              <Option value="url">URL</Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
          >
            {({ getFieldValue }) => {
              const fieldType = getFieldValue('type');
              if (fieldType === 'select' || fieldType === 'multiselect') {
                return (
                  <Form.List name="options">
                    {(fields, { add, remove }) => (
                      <>
                        <div className="flex justify-between items-center mb-2">
                          <span>Options</span>
                          <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                            Add Option
                          </Button>
                        </div>
                        {fields.map(({ key, name, ...restField }) => (
                          <Space key={key} className="flex mb-2" align="baseline">
                            <Form.Item
                              {...restField}
                              name={[name, 'value']}
                              rules={[{ required: true, message: 'Missing value' }]}
                            >
                              <Input placeholder="Value" />
                            </Form.Item>
                            <Form.Item
                              {...restField}
                              name={[name, 'label']}
                              rules={[{ required: true, message: 'Missing label' }]}
                            >
                              <Input placeholder="Label" />
                            </Form.Item>
                            <MinusCircleOutlined onClick={() => remove(name)} />
                          </Space>
                        ))}
                      </>
                    )}
                  </Form.List>
                );
              }
              return null;
            }}
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="required" valuePropName="checked">
                <Switch /> Required Field
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="visibility"
                label="Visibility"
                initialValue="public"
              >
                <Select>
                  <Option value="public">Public</Option>
                  <Option value="staff_only">Staff Only</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end space-x-2">
            <Button onClick={() => {
              setShowCreateModal(false);
              form.resetFields();
            }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              Create Field
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Edit Field Modal */}
      <Modal
        title="Edit Profile Field"
        open={showEditModal}
        onCancel={() => {
          setShowEditModal(false);
          setEditingField(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleEditField}>
          <Form.Item
            name="label"
            label="Field Label"
            rules={[{ required: true, message: 'Please enter field label' }]}
          >
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="required" valuePropName="checked">
                <Switch /> Required Field
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="visibility"
                label="Visibility"
              >
                <Select>
                  <Option value="public">Public</Option>
                  <Option value="staff_only">Staff Only</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end space-x-2">
            <Button onClick={() => {
              setShowEditModal(false);
              setEditingField(null);
              form.resetFields();
            }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              Update Field
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        title="Form Preview"
        open={showPreviewModal}
        onCancel={() => setShowPreviewModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowPreviewModal(false)}>
            Close
          </Button>
        ]}
        width={800}
      >
        <div className="space-y-4">
          <Text type="secondary">
            This is how the person form will look with current field definitions:
          </Text>
          <Divider />
          <Row gutter={16}>
            {activeFields.map((field) => (
              <Col key={field.key} span={field.type === 'textarea' ? 24 : 12}>
                <div className="mb-4">
                  <div className="mb-1">
                    <span className="font-medium">{field.label}</span>
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                    {field.visibility === 'staff_only' && (
                      <Tag color="orange" size="small" className="ml-2">Staff Only</Tag>
                    )}
                  </div>
                  {renderPreviewField(field)}
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </Modal>
    </div>
  );
};

export default ProfileFieldsPage;
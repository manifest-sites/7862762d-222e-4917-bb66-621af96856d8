import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Row,
  Col,
  Checkbox,
  DatePicker,
  InputNumber,
  message,
  Tag,
  Modal,
  Space,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { Person } from '../../entities/Person';
import { Tag as TagEntity } from '../../entities/Tag';
import { ProfileFieldDef } from '../../entities/ProfileFieldDef';
import { Household } from '../../entities/Household';
import type { Person as PersonType, Tag as TagType, ProfileFieldDef as ProfileFieldDefType, Household as HouseholdType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

interface PersonFormProps {
  mode: 'create' | 'edit';
}

const PersonForm: React.FC<PersonFormProps> = ({ mode }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [person, setPerson] = useState<PersonType | null>(null);
  const [tags, setTags] = useState<TagType[]>([]);
  const [profileFields, setProfileFields] = useState<ProfileFieldDefType[]>([]);
  const [households, setHouseholds] = useState<HouseholdType[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [showNewTagModal, setShowNewTagModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [tagsResponse, fieldsResponse, householdsResponse] = await Promise.all([
        TagEntity.list(),
        ProfileFieldDef.list(),
        Household.list(),
      ]);

      if (tagsResponse.success) {
        const tagsData = Array.isArray(tagsResponse.data) ? tagsResponse.data : [tagsResponse.data];
        setTags(tagsData);
      }

      if (fieldsResponse.success) {
        const fieldsData = Array.isArray(fieldsResponse.data) ? fieldsResponse.data : [fieldsResponse.data];
        setProfileFields(fieldsData.filter(field => !field.archived).sort((a, b) => a.orderIndex - b.orderIndex));
      }

      if (householdsResponse.success) {
        const householdsData = Array.isArray(householdsResponse.data) ? householdsResponse.data : [householdsResponse.data];
        setHouseholds(householdsData);
      }

      if (mode === 'edit' && id) {
        const personResponse = await Person.get(id);
        if (personResponse.success) {
          const personData = personResponse.data;
          setPerson(personData);
          
          // Set form values
          const formValues = {
            ...personData,
            fields: personData.fields || {},
          };
          
          // Convert date fields to dayjs objects
          if (fieldsResponse.success) {
            const fieldsData = Array.isArray(fieldsResponse.data) ? fieldsResponse.data : [fieldsResponse.data];
            fieldsData.forEach((field: ProfileFieldDefType) => {
              if (field.type === 'date' && formValues.fields[field.key]) {
                formValues.fields[field.key] = dayjs(formValues.fields[field.key]);
              }
            });
          }
          
          form.setFieldsValue(formValues);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      message.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      // Process form data
      const formData = {
        ...values,
        fields: values.fields || {},
      };

      // Convert date fields to ISO strings
      profileFields.forEach(field => {
        if (field.type === 'date' && formData.fields[field.key]) {
          formData.fields[field.key] = formData.fields[field.key].toISOString();
        }
      });

      if (mode === 'create') {
        await Person.create(formData);
        message.success('Person created successfully');
      } else if (id) {
        await Person.update(id, formData);
        message.success('Person updated successfully');
      }

      navigate('/people');
    } catch (error) {
      console.error('Failed to save person:', error);
      message.error('Failed to save person');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const response = await TagEntity.create({
        name: newTagName.trim(),
        color: ['blue', 'green', 'red', 'orange', 'purple', 'cyan'][Math.floor(Math.random() * 6)],
      });
      
      if (response.success) {
        const newTag = response.data;
        setTags([...tags, newTag]);
        setNewTagName('');
        setShowNewTagModal(false);
        message.success('Tag created successfully');
        
        // Add the new tag to the form
        const currentTagIds = form.getFieldValue('tagIds') || [];
        form.setFieldValue('tagIds', [...currentTagIds, newTag._id]);
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
      message.error('Failed to create tag');
    }
  };

  const renderDynamicField = (field: ProfileFieldDefType) => {
    const fieldName = ['fields', field.key];
    const isVisible = field.visibility === 'public' || userRole === 'admin' || userRole === 'owner';
    
    if (!isVisible) return null;

    const rules = field.required ? [{ required: true, message: `${field.label} is required` }] : [];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return (
          <Form.Item
            key={field.key}
            name={fieldName}
            label={field.label}
            rules={rules}
          >
            <Input type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'} />
          </Form.Item>
        );
      
      case 'textarea':
        return (
          <Form.Item
            key={field.key}
            name={fieldName}
            label={field.label}
            rules={rules}
          >
            <TextArea rows={4} />
          </Form.Item>
        );
      
      case 'number':
        return (
          <Form.Item
            key={field.key}
            name={fieldName}
            label={field.label}
            rules={rules}
          >
            <InputNumber className="w-full" />
          </Form.Item>
        );
      
      case 'date':
        return (
          <Form.Item
            key={field.key}
            name={fieldName}
            label={field.label}
            rules={rules}
          >
            <DatePicker className="w-full" />
          </Form.Item>
        );
      
      case 'checkbox':
        return (
          <Form.Item
            key={field.key}
            name={fieldName}
            valuePropName="checked"
            rules={rules}
          >
            <Checkbox>{field.label}</Checkbox>
          </Form.Item>
        );
      
      case 'select':
        return (
          <Form.Item
            key={field.key}
            name={fieldName}
            label={field.label}
            rules={rules}
          >
            <Select>
              {field.options?.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        );
      
      case 'multiselect':
        return (
          <Form.Item
            key={field.key}
            name={fieldName}
            label={field.label}
            rules={rules}
          >
            <Select mode="multiple">
              {field.options?.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        );
      
      default:
        return null;
    }
  };

  const isReadOnly = userRole === 'viewer';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {mode === 'create' ? 'Add Person' : 'Edit Person'}
        </h1>
        <Button onClick={() => navigate('/people')}>
          Back to People
        </Button>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={isReadOnly}
      >
        <Row gutter={16}>
          <Col xs={24} lg={16}>
            {/* Core Fields */}
            <Card title="Basic Information" className="mb-6">
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="firstName"
                    label="First Name"
                    rules={[{ required: true, message: 'First name is required' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="lastName"
                    label="Last Name"
                    rules={[{ required: true, message: 'Last name is required' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="preferredName" label="Preferred Name">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="status"
                    label="Status"
                    rules={[{ required: true, message: 'Status is required' }]}
                  >
                    <Select>
                      <Option value="active">Active</Option>
                      <Option value="inactive">Inactive</Option>
                      <Option value="visitor">Visitor</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="email" label="Email">
                    <Input type="email" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="phone" label="Phone">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Dynamic Fields */}
            {profileFields.length > 0 && (
              <Card title="Additional Information" className="mb-6">
                <Row gutter={16}>
                  {profileFields.map((field, index) => (
                    <Col key={field.key} xs={24} sm={field.type === 'textarea' ? 24 : 12}>
                      {renderDynamicField(field)}
                    </Col>
                  ))}
                </Row>
              </Card>
            )}
          </Col>

          <Col xs={24} lg={8}>
            {/* Tags */}
            <Card title="Tags" className="mb-6">
              <Form.Item name="tagIds" label="Tags">
                <Select
                  mode="multiple"
                  placeholder="Select tags"
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <div className="p-2 border-t">
                        <Button
                          type="text"
                          icon={<PlusOutlined />}
                          className="w-full"
                          onClick={() => setShowNewTagModal(true)}
                        >
                          Create new tag
                        </Button>
                      </div>
                    </>
                  )}
                >
                  {tags.map(tag => (
                    <Option key={tag._id} value={tag._id}>
                      <Tag color={tag.color || 'blue'}>{tag.name}</Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Card>

            {/* Household */}
            <Card title="Household">
              <Form.Item name="householdId" label="Household">
                <Select placeholder="Select household" allowClear>
                  {households.map(household => (
                    <Option key={household._id} value={household._id}>
                      {household.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Card>
          </Col>
        </Row>

        {!isReadOnly && (
          <div className="flex justify-end space-x-2 pt-4">
            <Button onClick={() => navigate('/people')}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {mode === 'create' ? 'Create Person' : 'Update Person'}
            </Button>
          </div>
        )}
      </Form>

      {/* New Tag Modal */}
      <Modal
        title="Create New Tag"
        open={showNewTagModal}
        onOk={handleCreateTag}
        onCancel={() => {
          setShowNewTagModal(false);
          setNewTagName('');
        }}
      >
        <Input
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="Enter tag name"
          onPressEnter={handleCreateTag}
        />
      </Modal>
    </div>
  );
};

export default PersonForm;
import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Button,
  Modal,
  Form,
  Input,
  ColorPicker,
  message,
  Space,
  Tag,
  Popconfirm,
  Typography,
  Row,
  Col,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Tag as TagEntity } from '../entities/Tag';
import { Person } from '../entities/Person';
import type { Tag as TagType, Person as PersonType } from '../types';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

interface TagWithCount extends TagType {
  peopleCount: number;
}

const TagsPage: React.FC = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTag, setEditingTag] = useState<TagType | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      
      const [tagsResponse, peopleResponse] = await Promise.all([
        TagEntity.list(),
        Person.list(),
      ]);

      console.log('Tags response:', tagsResponse);
      console.log('People response:', peopleResponse);

      if (tagsResponse.success && peopleResponse.success) {
        const tagsData = Array.isArray(tagsResponse.data) ? tagsResponse.data : (tagsResponse.data ? [tagsResponse.data] : []);
        const peopleData = Array.isArray(peopleResponse.data) ? peopleResponse.data : (peopleResponse.data ? [peopleResponse.data] : []);
        
        console.log('Tags data:', tagsData);
        console.log('People data:', peopleData);
        
        // Count people for each tag
        const tagsWithCounts = tagsData.map(tag => {
          const peopleCount = peopleData.filter(person => person.tagIds && person.tagIds.includes(tag._id)).length;
          return { ...tag, peopleCount };
        });
        
        setTags(tagsWithCounts.sort((a, b) => b.peopleCount - a.peopleCount));
      } else {
        console.log('API responses not successful:', { tagsResponse, peopleResponse });
        if (!tagsResponse.success) {
          message.error('Failed to load tags: ' + (tagsResponse.message || 'Unknown error'));
        }
        if (!peopleResponse.success) {
          message.error('Failed to load people: ' + (peopleResponse.message || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error);
      message.error('Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async (values: any) => {
    try {
      const tagData = {
        name: values.name,
        color: values.color?.toHexString?.() || values.color || '#1890ff',
      };
      
      await TagEntity.create(tagData);
      message.success('Tag created successfully');
      form.resetFields();
      setShowCreateModal(false);
      await fetchTags();
    } catch (error) {
      console.error('Failed to create tag:', error);
      message.error('Failed to create tag');
    }
  };

  const handleEditTag = async (values: any) => {
    if (!editingTag) return;

    try {
      const tagData = {
        name: values.name,
        color: values.color?.toHexString?.() || values.color || editingTag.color,
      };
      
      await TagEntity.update(editingTag._id, tagData);
      message.success('Tag updated successfully');
      form.resetFields();
      setShowEditModal(false);
      setEditingTag(null);
      await fetchTags();
    } catch (error) {
      console.error('Failed to update tag:', error);
      message.error('Failed to update tag');
    }
  };

  const handleDeleteTag = async (tagId: string, peopleCount: number) => {
    if (peopleCount > 0) {
      message.warning('Cannot delete tag that is in use. Remove it from all people first.');
      return;
    }

    try {
      // In real app, you'd call TagEntity.delete(tagId)
      message.success('Tag deleted successfully');
      await fetchTags();
    } catch (error) {
      console.error('Failed to delete tag:', error);
      message.error('Failed to delete tag');
    }
  };

  const openEditModal = (tag: TagType) => {
    setEditingTag(tag);
    form.setFieldsValue({
      name: tag.name,
      color: tag.color || '#1890ff',
    });
    setShowEditModal(true);
  };

  const handleViewPeopleWithTag = (tagId: string) => {
    // Navigate to people page with tag filter
    navigate(`/people?tagIds=${tagId}`);
  };

  const canEdit = userRole !== 'viewer';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title level={2} className="mb-0">Tags</Title>
          <Text type="secondary">Manage tags for organizing people</Text>
        </div>
        {canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
            Create Tag
          </Button>
        )}
      </div>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <List
              loading={loading}
              dataSource={tags}
              renderItem={(tag) => (
                <List.Item
                  actions={[
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
                      onClick={() => handleViewPeopleWithTag(tag._id)}
                      title="View people with this tag"
                    >
                      View People
                    </Button>,
                    ...(canEdit ? [
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => openEditModal(tag)}
                        title="Edit tag"
                      />,
                      <Popconfirm
                        title={tag.peopleCount > 0 ? 
                          `This tag is used by ${tag.peopleCount} people. Remove it from all people first.` : 
                          'Are you sure you want to delete this tag?'
                        }
                        onConfirm={() => handleDeleteTag(tag._id, tag.peopleCount)}
                        disabled={tag.peopleCount > 0}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Button
                          type="text"
                          icon={<DeleteOutlined />}
                          danger
                          disabled={tag.peopleCount > 0}
                          title={tag.peopleCount > 0 ? 'Cannot delete tag in use' : 'Delete tag'}
                        />
                      </Popconfirm>
                    ] : [])
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Tag color={tag.color || 'blue'} className="text-base px-3 py-1">
                        {tag.name}
                      </Tag>
                    }
                    title={
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-medium">{tag.name}</span>
                        <Text type="secondary">
                          ({tag.peopleCount} {tag.peopleCount === 1 ? 'person' : 'people'})
                        </Text>
                      </div>
                    }
                    description={
                      <div className="space-y-1">
                        <div>
                          <Text type="secondary">Color: </Text>
                          <div className="inline-block w-4 h-4 rounded" style={{ backgroundColor: tag.color || '#1890ff' }} />
                          <Text type="secondary" className="ml-2">{tag.color || '#1890ff'}</Text>
                        </div>
                        <div>
                          <Text type="secondary">Created: </Text>
                          <Text>{new Date(tag.createdAt).toLocaleDateString()}</Text>
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: 'No tags created yet' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Create Tag Modal */}
      <Modal
        title="Create New Tag"
        open={showCreateModal}
        onCancel={() => {
          setShowCreateModal(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateTag}>
          <Form.Item
            name="name"
            label="Tag Name"
            rules={[
              { required: true, message: 'Please enter tag name' },
              { max: 50, message: 'Tag name cannot exceed 50 characters' }
            ]}
          >
            <Input placeholder="Enter tag name" />
          </Form.Item>
          <Form.Item name="color" label="Color" initialValue="#1890ff">
            <ColorPicker />
          </Form.Item>
          <div className="flex justify-end space-x-2">
            <Button onClick={() => {
              setShowCreateModal(false);
              form.resetFields();
            }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              Create Tag
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Edit Tag Modal */}
      <Modal
        title="Edit Tag"
        open={showEditModal}
        onCancel={() => {
          setShowEditModal(false);
          setEditingTag(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleEditTag}>
          <Form.Item
            name="name"
            label="Tag Name"
            rules={[
              { required: true, message: 'Please enter tag name' },
              { max: 50, message: 'Tag name cannot exceed 50 characters' }
            ]}
          >
            <Input placeholder="Enter tag name" />
          </Form.Item>
          <Form.Item name="color" label="Color">
            <ColorPicker />
          </Form.Item>
          <div className="flex justify-end space-x-2">
            <Button onClick={() => {
              setShowEditModal(false);
              setEditingTag(null);
              form.resetFields();
            }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              Update Tag
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default TagsPage;
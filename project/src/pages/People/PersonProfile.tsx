import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Tag,
  Descriptions,
  List,
  Input,
  Form,
  Select,
  message,
  Modal,
  Space,
  Typography,
} from 'antd';
import {
  EditOutlined,
  PlusOutlined,
  TagsOutlined,
  HomeOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Person } from '../../entities/Person';
import { Note } from '../../entities/Note';
import { Tag as TagEntity } from '../../entities/Tag';
import { ProfileFieldDef } from '../../entities/ProfileFieldDef';
import { Household } from '../../entities/Household';
import { HouseholdMember } from '../../entities/HouseholdMember';
import type { Person as PersonType, Note as NoteType, Tag as TagType, ProfileFieldDef as ProfileFieldDefType, Household as HouseholdType, HouseholdMember as HouseholdMemberType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const { TextArea } = Input;
const { Title, Text } = Typography;

const PersonProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole, user } = useAuth();
  const [person, setPerson] = useState<PersonType | null>(null);
  const [notes, setNotes] = useState<NoteType[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [profileFields, setProfileFields] = useState<ProfileFieldDefType[]>([]);
  const [household, setHousehold] = useState<HouseholdType | null>(null);
  const [householdMembers, setHouseholdMembers] = useState<PersonType[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteForm] = Form.useForm();
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPersonData();
    }
  }, [id]);

  const fetchPersonData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      
      const [personResponse, notesResponse, tagsResponse, fieldsResponse] = await Promise.all([
        Person.get(id),
        Note.list(), // In real app, filter by personId
        TagEntity.list(),
        ProfileFieldDef.list(),
      ]);

      if (personResponse.success) {
        const personData = personResponse.data;
        setPerson(personData);

        // Fetch household data if person has one
        if (personData.householdId) {
          const [householdResponse, membersResponse] = await Promise.all([
            Household.get(personData.householdId),
            HouseholdMember.list(), // In real app, filter by householdId
          ]);

          if (householdResponse.success) {
            setHousehold(householdResponse.data);
          }

          if (membersResponse.success) {
            const members = Array.isArray(membersResponse.data) ? membersResponse.data : [membersResponse.data];
            // In real app, you'd fetch person data for each member
            // For now, using mock data
            setHouseholdMembers([]);
          }
        }
      }

      if (notesResponse.success) {
        const notesData = Array.isArray(notesResponse.data) ? notesResponse.data : [notesResponse.data];
        // Filter notes for this person (in real app, this would be done server-side)
        setNotes(notesData.filter(note => note.personId === id));
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
      console.error('Failed to fetch person data:', error);
      message.error('Failed to load person data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (values: any) => {
    if (!id || !user) return;

    try {
      await Note.create({
        personId: id,
        authorUserId: user._id,
        body: values.body,
        visibility: values.visibility,
      });
      
      message.success('Note added successfully');
      noteForm.resetFields();
      setShowNoteModal(false);
      await fetchPersonData();
    } catch (error) {
      console.error('Failed to add note:', error);
      message.error('Failed to add note');
    }
  };

  const handleUpdateTags = async (tagIds: string[]) => {
    if (!id) return;

    try {
      await Person.update(id, { tagIds });
      message.success('Tags updated successfully');
      setShowTagModal(false);
      await fetchPersonData();
    } catch (error) {
      console.error('Failed to update tags:', error);
      message.error('Failed to update tags');
    }
  };

  if (loading || !person) {
    return <div>Loading...</div>;
  }

  const getPersonName = () => {
    return person.preferredName || `${person.firstName} ${person.lastName}`;
  };

  const getPersonTags = () => {
    return tags.filter(tag => person.tagIds.includes(tag._id));
  };

  const getFieldValue = (field: ProfileFieldDefType) => {
    const value = person.fields[field.key];
    if (value === undefined || value === null) return '-';
    
    if (field.type === 'checkbox') {
      return value ? 'Yes' : 'No';
    } else if (field.type === 'multiselect') {
      return Array.isArray(value) ? value.join(', ') : value;
    } else if (field.type === 'date') {
      return new Date(value).toLocaleDateString();
    }
    
    return value.toString();
  };

  const visibleFields = profileFields.filter(field => 
    field.visibility === 'public' || userRole === 'admin' || userRole === 'owner'
  );

  const canEdit = userRole !== 'viewer';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title level={2} className="mb-0">{getPersonName()}</Title>
          <Space>
            <Tag color={
              person.status === 'active' ? 'green' : 
              person.status === 'inactive' ? 'red' : 
              'orange'
            }>
              {person.status.toUpperCase()}
            </Tag>
            {getPersonTags().map(tag => (
              <Tag key={tag._id} color={tag.color || 'blue'}>
                {tag.name}
              </Tag>
            ))}
          </Space>
        </div>
        <Space>
          {canEdit && (
            <>
              <Button icon={<MessageOutlined />} onClick={() => setShowNoteModal(true)}>
                Add Note
              </Button>
              <Button icon={<TagsOutlined />} onClick={() => setShowTagModal(true)}>
                Manage Tags
              </Button>
              <Button icon={<EditOutlined />} type="primary" onClick={() => navigate(`/people/${id}/edit`)}>
                Edit Person
              </Button>
            </>
          )}
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          {/* Core Details */}
          <Card title="Contact Information" className="mb-6">
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Full Name">
                {`${person.firstName} ${person.lastName}`}
              </Descriptions.Item>
              <Descriptions.Item label="Preferred Name">
                {person.preferredName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {person.email ? (
                  <a href={`mailto:${person.email}`}>{person.email}</a>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {person.phone ? (
                  <a href={`tel:${person.phone}`}>{person.phone}</a>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={
                  person.status === 'active' ? 'green' : 
                  person.status === 'inactive' ? 'red' : 
                  'orange'
                }>
                  {person.status.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Member Since">
                {new Date(person.createdAt).toLocaleDateString()}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Dynamic Fields */}
          {visibleFields.length > 0 && (
            <Card title="Additional Information" className="mb-6">
              <Descriptions bordered column={2}>
                {visibleFields.map(field => (
                  <Descriptions.Item key={field.key} label={field.label}>
                    {getFieldValue(field)}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Card>
          )}

          {/* Notes */}
          <Card title="Notes">
            <List
              dataSource={notes}
              renderItem={(note) => (
                <List.Item>
                  <div className="w-full">
                    <div className="flex justify-between items-start mb-2">
                      <Text strong>Note</Text>
                      <div className="space-x-2">
                        <Tag color={note.visibility === 'staff_only' ? 'red' : 'blue'}>
                          {note.visibility === 'staff_only' ? 'Staff Only' : 'Organization'}
                        </Tag>
                        <Text type="secondary" className="text-sm">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </Text>
                      </div>
                    </div>
                    <Text>{note.body}</Text>
                  </div>
                </List.Item>
              )}
              locale={{ emptyText: 'No notes yet' }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          {/* Household */}
          {household && (
            <Card title="Household" className="mb-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{household.name}</span>
                  <Button
                    type="link"
                    icon={<HomeOutlined />}
                    onClick={() => navigate(`/households/${household._id}`)}
                  >
                    View Household
                  </Button>
                </div>
                {householdMembers.length > 0 && (
                  <div>
                    <Text type="secondary">Members:</Text>
                    <List
                      size="small"
                      dataSource={householdMembers}
                      renderItem={(member) => (
                        <List.Item className="px-0">
                          <Link to={`/people/${member._id}`}>
                            {member.firstName} {member.lastName}
                          </Link>
                        </List.Item>
                      )}
                    />
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          {canEdit && (
            <Card title="Quick Actions">
              <div className="space-y-2">
                <Button block icon={<EditOutlined />} onClick={() => navigate(`/people/${id}/edit`)}>
                  Edit Person
                </Button>
                <Button block icon={<MessageOutlined />} onClick={() => setShowNoteModal(true)}>
                  Add Note
                </Button>
                <Button block icon={<TagsOutlined />} onClick={() => setShowTagModal(true)}>
                  Manage Tags
                </Button>
              </div>
            </Card>
          )}
        </Col>
      </Row>

      {/* Add Note Modal */}
      <Modal
        title="Add Note"
        open={showNoteModal}
        onCancel={() => {
          setShowNoteModal(false);
          noteForm.resetFields();
        }}
        footer={null}
      >
        <Form form={noteForm} layout="vertical" onFinish={handleAddNote}>
          <Form.Item
            name="body"
            label="Note"
            rules={[{ required: true, message: 'Please enter a note' }]}
          >
            <TextArea rows={4} placeholder="Enter your note here..." />
          </Form.Item>
          <Form.Item
            name="visibility"
            label="Visibility"
            rules={[{ required: true, message: 'Please select visibility' }]}
          >
            <Select>
              <Select.Option value="org">Organization</Select.Option>
              <Select.Option value="staff_only">Staff Only</Select.Option>
            </Select>
          </Form.Item>
          <div className="flex justify-end space-x-2">
            <Button onClick={() => {
              setShowNoteModal(false);
              noteForm.resetFields();
            }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              Add Note
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Manage Tags Modal */}
      <Modal
        title="Manage Tags"
        open={showTagModal}
        onCancel={() => setShowTagModal(false)}
        footer={null}
      >
        <Form
          initialValues={{ tagIds: person.tagIds }}
          onFinish={(values) => handleUpdateTags(values.tagIds || [])}
          layout="vertical"
        >
          <Form.Item name="tagIds" label="Tags">
            <Select mode="multiple" placeholder="Select tags">
              {tags.map(tag => (
                <Select.Option key={tag._id} value={tag._id}>
                  <Tag color={tag.color || 'blue'}>{tag.name}</Tag>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <div className="flex justify-end space-x-2">
            <Button onClick={() => setShowTagModal(false)}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              Update Tags
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default PersonProfile;
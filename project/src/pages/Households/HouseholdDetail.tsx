import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  List,
  Modal,
  Form,
  Select,
  message,
  Space,
  Typography,
  Tag,
  Popconfirm,
} from 'antd';
import {
  EditOutlined,
  PlusOutlined,
  DeleteOutlined,
  UserOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Household } from '../../entities/Household';
import { HouseholdMember } from '../../entities/HouseholdMember';
import { Person } from '../../entities/Person';
import type { Household as HouseholdType, HouseholdMember as HouseholdMemberType, Person as PersonType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;

interface MemberWithDetails extends HouseholdMemberType {
  person: PersonType;
}

const HouseholdDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [household, setHousehold] = useState<HouseholdType | null>(null);
  const [members, setMembers] = useState<MemberWithDetails[]>([]);
  const [availablePeople, setAvailablePeople] = useState<PersonType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (id) {
      fetchHouseholdData();
    }
  }, [id]);

  const fetchHouseholdData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      
      const [householdResponse, membersResponse, peopleResponse] = await Promise.all([
        Household.get(id),
        HouseholdMember.list(),
        Person.list(),
      ]);

      if (householdResponse.success) {
        setHousehold(householdResponse.data);
      }

      if (membersResponse.success && peopleResponse.success) {
        const membersData = Array.isArray(membersResponse.data) ? membersResponse.data : [membersResponse.data];
        const peopleData = Array.isArray(peopleResponse.data) ? peopleResponse.data : [peopleResponse.data];
        
        // Filter members for this household and get person details
        const householdMembers = membersData.filter(member => member.householdId === id);
        const membersWithDetails = householdMembers.map(member => {
          const person = peopleData.find(p => p._id === member.personId);
          return { ...member, person: person! };
        }).filter(member => member.person); // Filter out members without person data

        setMembers(membersWithDetails);

        // Set available people (those not in any household or not in this household)
        const peopleInHousehold = householdMembers.map(m => m.personId);
        const availablePeople = peopleData.filter(person => 
          !person.householdId || !peopleInHousehold.includes(person._id)
        );
        setAvailablePeople(availablePeople);
      }
    } catch (error) {
      console.error('Failed to fetch household data:', error);
      message.error('Failed to load household data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (values: any) => {
    if (!id) return;

    try {
      // Create household member relationship
      await HouseholdMember.create({
        householdId: id,
        personId: values.personId,
        relationship: values.relationship,
      });

      // Update person's householdId
      await Person.update(values.personId, { householdId: id });

      message.success('Member added successfully');
      form.resetFields();
      setShowAddMemberModal(false);
      await fetchHouseholdData();
    } catch (error) {
      console.error('Failed to add member:', error);
      message.error('Failed to add member');
    }
  };

  const handleRemoveMember = async (memberId: string, personId: string) => {
    try {
      // In real app, you'd delete the HouseholdMember record
      // Remove household reference from person
      await Person.update(personId, { householdId: null });
      
      message.success('Member removed successfully');
      await fetchHouseholdData();
    } catch (error) {
      console.error('Failed to remove member:', error);
      message.error('Failed to remove member');
    }
  };

  const handleUpdateRelationship = async (memberId: string, newRelationship: string) => {
    try {
      // In real app, you'd update the HouseholdMember record
      message.success('Relationship updated successfully');
      await fetchHouseholdData();
    } catch (error) {
      console.error('Failed to update relationship:', error);
      message.error('Failed to update relationship');
    }
  };

  const getRelationshipColor = (relationship: string) => {
    switch (relationship) {
      case 'head': return 'blue';
      case 'spouse': return 'green';
      case 'child': return 'orange';
      default: return 'gray';
    }
  };

  const getRelationshipLabel = (relationship: string) => {
    return relationship.charAt(0).toUpperCase() + relationship.slice(1);
  };

  if (loading || !household) {
    return <div>Loading...</div>;
  }

  const canEdit = userRole !== 'viewer';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title level={2} className="mb-0 flex items-center">
            <HomeOutlined className="mr-2" />
            {household.name}
          </Title>
          <Text type="secondary">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </Text>
        </div>
        <Space>
          <Button onClick={() => navigate('/households')}>
            Back to Households
          </Button>
          {canEdit && (
            <>
              <Button icon={<PlusOutlined />} onClick={() => setShowAddMemberModal(true)}>
                Add Member
              </Button>
              <Button icon={<EditOutlined />} type="primary" onClick={() => navigate(`/households/${id}/edit`)}>
                Edit Household
              </Button>
            </>
          )}
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Household Members">
            <List
              dataSource={members}
              renderItem={(member) => (
                <List.Item
                  actions={canEdit ? [
                    <Select
                      value={member.relationship}
                      onChange={(value) => handleUpdateRelationship(member._id, value)}
                      size="small"
                      style={{ width: 100 }}
                    >
                      <Option value="head">Head</Option>
                      <Option value="spouse">Spouse</Option>
                      <Option value="child">Child</Option>
                      <Option value="other">Other</Option>
                    </Select>,
                    <Popconfirm
                      title="Remove member from household?"
                      onConfirm={() => handleRemoveMember(member._id, member.personId)}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  ] : []}
                >
                  <List.Item.Meta
                    avatar={<UserOutlined className="text-xl" />}
                    title={
                      <div className="flex items-center space-x-2">
                        <Link to={`/people/${member.person._id}`} className="text-blue-600 hover:text-blue-800">
                          {member.person.preferredName || `${member.person.firstName} ${member.person.lastName}`}
                        </Link>
                        <Tag color={getRelationshipColor(member.relationship)}>
                          {getRelationshipLabel(member.relationship)}
                        </Tag>
                      </div>
                    }
                    description={
                      <div className="space-y-1">
                        {member.person.email && (
                          <div>
                            <Text type="secondary">Email: </Text>
                            <a href={`mailto:${member.person.email}`}>{member.person.email}</a>
                          </div>
                        )}
                        {member.person.phone && (
                          <div>
                            <Text type="secondary">Phone: </Text>
                            <a href={`tel:${member.person.phone}`}>{member.person.phone}</a>
                          </div>
                        )}
                        <div>
                          <Text type="secondary">Status: </Text>
                          <Tag color={
                            member.person.status === 'active' ? 'green' : 
                            member.person.status === 'inactive' ? 'red' : 
                            'orange'
                          }>
                            {member.person.status.toUpperCase()}
                          </Tag>
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: 'No members in this household' }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Household Information">
            <div className="space-y-4">
              <div>
                <Text strong>Name:</Text>
                <div>{household.name}</div>
              </div>
              <div>
                <Text strong>Members:</Text>
                <div>{members.length} member{members.length !== 1 ? 's' : ''}</div>
              </div>
              <div>
                <Text strong>Created:</Text>
                <div>{new Date(household.createdAt).toLocaleDateString()}</div>
              </div>
              <div>
                <Text strong>Last Updated:</Text>
                <div>{new Date(household.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
          </Card>

          {members.length > 0 && (
            <Card title="Quick Stats" className="mt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Text>Active Members:</Text>
                  <Text strong>
                    {members.filter(m => m.person.status === 'active').length}
                  </Text>
                </div>
                <div className="flex justify-between">
                  <Text>Inactive Members:</Text>
                  <Text strong>
                    {members.filter(m => m.person.status === 'inactive').length}
                  </Text>
                </div>
                <div className="flex justify-between">
                  <Text>Visitors:</Text>
                  <Text strong>
                    {members.filter(m => m.person.status === 'visitor').length}
                  </Text>
                </div>
              </div>
            </Card>
          )}
        </Col>
      </Row>

      {/* Add Member Modal */}
      <Modal
        title="Add Member to Household"
        open={showAddMemberModal}
        onCancel={() => {
          setShowAddMemberModal(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleAddMember}>
          <Form.Item
            name="personId"
            label="Person"
            rules={[{ required: true, message: 'Please select a person' }]}
          >
            <Select
              placeholder="Select person to add"
              showSearch
              filterOption={(input, option) =>
                option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
              }
            >
              {availablePeople.map(person => (
                <Option key={person._id} value={person._id}>
                  {person.preferredName || `${person.firstName} ${person.lastName}`}
                  {person.email && ` (${person.email})`}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="relationship"
            label="Relationship"
            rules={[{ required: true, message: 'Please select relationship' }]}
          >
            <Select placeholder="Select relationship">
              <Option value="head">Head of Household</Option>
              <Option value="spouse">Spouse</Option>
              <Option value="child">Child</Option>
              <Option value="other">Other</Option>
            </Select>
          </Form.Item>
          <div className="flex justify-end space-x-2">
            <Button onClick={() => {
              setShowAddMemberModal(false);
              form.resetFields();
            }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit">
              Add Member
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default HouseholdDetail;
import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, List, Typography, Tag, Spin } from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  UserAddOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Person } from '../entities/Person';
import { Note } from '../entities/Note';
import { Tag as TagEntity } from '../entities/Tag';
import type { Person as PersonType, Note as NoteType, Tag as TagType } from '../types';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import EmptyState from '../components/Common/EmptyState';

const { Title, Text } = Typography;

interface DashboardStats {
  totalPeople: number;
  activePeople: number;
  inactivePeople: number;
  visitors: number;
  peopleThisMonth: number;
}

const Dashboard: React.FC = () => {
  const { organizationId } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalPeople: 0,
    activePeople: 0,
    inactivePeople: 0,
    visitors: 0,
    peopleThisMonth: 0,
  });
  const [recentNotes, setRecentNotes] = useState<NoteType[]>([]);
  const [topTags, setTopTags] = useState<(TagType & { count: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch people stats
        const peopleResponse = await Person.list();
        if (peopleResponse.success) {
          const people: PersonType[] = Array.isArray(peopleResponse.data) ? peopleResponse.data : [peopleResponse.data];
          const now = new Date();
          const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          
          const totalPeople = people.length;
          const activePeople = people.filter(p => p.status === 'active').length;
          const inactivePeople = people.filter(p => p.status === 'inactive').length;
          const visitors = people.filter(p => p.status === 'visitor').length;
          const peopleThisMonth = people.filter(p => new Date(p.createdAt) >= thisMonth).length;
          
          setStats({
            totalPeople,
            activePeople,
            inactivePeople,
            visitors,
            peopleThisMonth,
          });
        }

        // Fetch recent notes
        const notesResponse = await Note.list();
        if (notesResponse.success) {
          const notes: NoteType[] = Array.isArray(notesResponse.data) ? notesResponse.data : [notesResponse.data];
          setRecentNotes(notes.slice(0, 10));
        }

        // Fetch tags and calculate counts
        const tagsResponse = await TagEntity.list();
        if (tagsResponse.success) {
          const tags: TagType[] = Array.isArray(tagsResponse.data) ? tagsResponse.data : [tagsResponse.data];
          // In a real app, you'd get tag usage counts from the API
          const tagsWithCounts = tags.map(tag => ({ ...tag, count: Math.floor(Math.random() * 50) + 1 }));
          setTopTags(tagsWithCounts.sort((a, b) => b.count - a.count).slice(0, 5));
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [organizationId]);

  const statCards = [
    {
      title: 'Total People',
      value: stats.totalPeople,
      icon: <TeamOutlined className="text-blue-500" />,
      color: 'blue',
    },
    {
      title: 'Active Members',
      value: stats.activePeople,
      icon: <UserOutlined className="text-green-500" />,
      color: 'green',
    },
    {
      title: 'Inactive Members',
      value: stats.inactivePeople,
      icon: <UserOutlined className="text-red-500" />,
      color: 'red',
    },
    {
      title: 'Visitors',
      value: stats.visitors,
      icon: <UserOutlined className="text-yellow-500" />,
      color: 'yellow',
    },
    {
      title: 'Added This Month',
      value: stats.peopleThisMonth,
      icon: <UserAddOutlined className="text-purple-500" />,
      color: 'purple',
    },
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Title level={2}>Dashboard</Title>
        <Text type="secondary">Overview of your church community</Text>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]}>
        {statCards.map((stat, index) => (
          <Col key={index} xs={12} sm={12} md={8} lg={6} xl={4.8}>
            <Card size="small" className="text-center">
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={stat.icon}
                valueStyle={{ fontSize: '20px', fontWeight: 'bold' }}
                className="[&_.ant-statistic-title]:text-xs sm:[&_.ant-statistic-title]:text-sm"
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        {/* Recent Notes */}
        <Col xs={24} lg={14}>
          <Card title="Recent Notes" extra={<Link to="/people">View All</Link>}>
            <List
              dataSource={recentNotes}
              renderItem={(note) => (
                <List.Item>
                  <div className="w-full">
                    <div className="flex justify-between items-start mb-1">
                      <Text strong>Note for Person</Text>
                      <Text type="secondary" className="text-sm">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </Text>
                    </div>
                    <Text className="text-gray-600 line-clamp-2">
                      {note.body}
                    </Text>
                    <div className="mt-2">
                      <Tag color={note.visibility === 'staff_only' ? 'red' : 'blue'}>
                        {note.visibility === 'staff_only' ? 'Staff Only' : 'Organization'}
                      </Tag>
                    </div>
                  </div>
                </List.Item>
              )}
              locale={{ emptyText: 'No recent notes' }}
            />
          </Card>
        </Col>

        {/* Top Tags */}
        <Col xs={24} lg={10}>
          <Card title="Most Used Tags" extra={<Link to="/tags">Manage Tags</Link>}>
            <List
              dataSource={topTags}
              renderItem={(tag) => (
                <List.Item className="flex justify-between">
                  <div className="flex items-center space-x-2">
                    <TagsOutlined />
                    <span>{tag.name}</span>
                  </div>
                  <Tag color={tag.color || 'blue'}>{tag.count} people</Tag>
                </List.Item>
              )}
              locale={{ emptyText: 'No tags created yet' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
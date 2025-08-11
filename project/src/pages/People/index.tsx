import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PeopleList from './PeopleList';
import PersonForm from './PersonForm';
import PersonProfile from './PersonProfile';

const PeopleRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<PeopleList />} />
      <Route path="/new" element={<PersonForm mode="create" />} />
      <Route path="/:id" element={<PersonProfile />} />
      <Route path="/:id/edit" element={<PersonForm mode="edit" />} />
    </Routes>
  );
};

export default PeopleRoutes;
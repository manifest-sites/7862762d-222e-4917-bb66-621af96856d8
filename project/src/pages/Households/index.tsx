import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HouseholdsList from './HouseholdsList';
import HouseholdDetail from './HouseholdDetail';

const HouseholdsRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<HouseholdsList />} />
      <Route path="/:id" element={<HouseholdDetail />} />
    </Routes>
  );
};

export default HouseholdsRoutes;
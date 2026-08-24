import React from 'react';
import SimulationView from '../components/simulation/SimulationView';
import { useSimulationPage } from '../components/simulation/useSimulationPage';

const Simulation: React.FC = () => {
  const model = useSimulationPage();
  return <SimulationView model={model} />;
};

export default Simulation;

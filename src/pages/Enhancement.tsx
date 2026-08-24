import React from 'react';
import EnhancementView from '../components/enhancement/EnhancementView';
import { useEnhancementPage } from '../components/enhancement/useEnhancementPage';

const Enhancement: React.FC = () => {
  const model = useEnhancementPage();
  return <EnhancementView model={model} />;
};

export default Enhancement;

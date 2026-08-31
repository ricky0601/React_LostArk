import React from 'react';
import NavBar from '../NavBar';
import EnhancementCharacterSection from './EnhancementCharacterSection';
import EnhancementMaterialsSection from './EnhancementMaterialsSection';
import EnhancementResultsSection from './EnhancementResultsSection';
import EnhancementSettingsSection from './EnhancementSettingsSection';
import type { EnhancementPageModel } from './useEnhancementPage';

const EnhancementView: React.FC<{ model: EnhancementPageModel }> = ({ model }) => (
  <div>
    <NavBar />
    <main className="enhancement-page max-w-4xl mx-auto px-4 py-6 space-y-5">
      <EnhancementCharacterSection model={model} />
      <EnhancementSettingsSection model={model} />
      <EnhancementResultsSection model={model} section="summary" />
      <EnhancementMaterialsSection model={model} />
      <EnhancementResultsSection model={model} section="details" />
    </main>
  </div>
);

export default EnhancementView;

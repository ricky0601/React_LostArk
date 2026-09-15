import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RaidCompositionTabs from './RaidCompositionTabs';

it.each([
  ['/raid-composition', '공대 시너지', '/raid-composition'],
  ['/raid-composition/applicants', '신청자 사사게 조회', '/raid-composition/applicants'],
])('marks the matching raid helper tab active at %s', (path, label, href) => {
  render(<MemoryRouter initialEntries={[path]}><RaidCompositionTabs /></MemoryRouter>);

  const active = screen.getByRole('link', { name: label });
  expect(active).toHaveAttribute('href', href);
  expect(active).toHaveAttribute('aria-current', 'page');
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MORE_NAV_LINKS, NavLinks } from './NavLinks';

it('exposes one 공대 도우미 menu item and marks nested routes active', () => {
  expect(MORE_NAV_LINKS.filter((link) => link.label === '공대 도우미')).toHaveLength(1);

  render(
    <MemoryRouter>
      <NavLinks links={MORE_NAV_LINKS} pathname="/raid-composition/applicants" />
    </MemoryRouter>,
  );

  expect(screen.getByRole('link', { name: '공대 도우미' })).toHaveAttribute('aria-current', 'page');
});

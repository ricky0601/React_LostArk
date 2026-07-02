import { render, screen } from '@testing-library/react';

jest.mock(
  'react-router-dom',
  () => {
    const React = require('react');
    return {
      BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      Routes: ({ children }: { children: React.ReactNode }) => <>{children}</>,
      Route: ({ element }: { element: React.ReactElement }) => element,
    };
  },
  { virtual: true },
);

jest.mock('./pages/Home', () => () => <div>Home Page</div>);
jest.mock('./pages/Character', () => () => <div>Character Page</div>);
jest.mock('./pages/Simulation', () => () => <div>Simulation Page</div>);
jest.mock('./pages/SpecSimulator', () => () => <div>Spec Simulator Page</div>);
jest.mock('./pages/Expedition', () => () => <div>Expedition Page</div>);
jest.mock('./pages/Compare', () => () => <div>Compare Page</div>);
jest.mock('./pages/Enhancement', () => () => <div>Enhancement Page</div>);
jest.mock('./pages/Market', () => () => <div>Market Page</div>);
jest.mock('./pages/Spending', () => () => <div>Spending Page</div>);

import App from './App';

test('renders the home route', () => {
  render(<App />);

  expect(screen.getByText('Home Page')).toBeInTheDocument();
});

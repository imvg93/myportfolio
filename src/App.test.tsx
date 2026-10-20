import { render, screen } from '@testing-library/react';
import App from '../app/page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

test('renders main headline', () => {
  render(<App />);
  const headlineElement = screen.getByText(/Journey/i);
  expect(headlineElement).toBeInTheDocument();
});


import { render, screen } from '@testing-library/react';
import App from '../app/page';

test('renders main headline', () => {
  render(<App />);
  const headlineElement = screen.getByText(/Hover To Know About Me/i);
  expect(headlineElement).toBeInTheDocument();
});


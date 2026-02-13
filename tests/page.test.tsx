import { render, screen } from '@testing-library/react';
import Page from '@/app/page';

describe('Page Component', () => {
  it('renders heading and paragraph', () => {
    render(<Page />);
    expect(screen.getByText(/AI Chat App/i)).toBeInTheDocument();
    expect(screen.getByText(/Getting started with AI chat functionality/i)).toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Button } from '../button';

// Simple test to verify testing infrastructure is working
describe('Button Component', () => {
  it('renders a button with text', () => {
    render(<Button>Click me</Button>);
    
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('renders a button with correct role', () => {
    render(<Button>Test Button</Button>);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('can be disabled', () => {
    render(<Button disabled>Disabled Button</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
}); 
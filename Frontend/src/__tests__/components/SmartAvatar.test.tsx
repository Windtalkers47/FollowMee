import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SmartAvatar from '../../components/SmartAvatar';

describe('SmartAvatar', () => {
  it('uses the first Unicode character of a Thai display name', () => {
    render(<SmartAvatar user={{ userName: 'โคคา', userLastName: 'โคล่า' }} />);
    expect(screen.getByText('โ')).toBeInTheDocument();
  });

  it('does not expose an English U fallback when the name is missing', () => {
    const { container } = render(<SmartAvatar user={{}} />);
    expect(container.textContent).toBe('');
  });
});

import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { describe, expect, it } from 'vitest';
import TaskHeader from '../../components/TaskCard/TaskHeader';
import type { Task } from '../../api/task.api';

describe('TaskHeader status contrast', () => {
  it('uses dark semantic text for Done on the light theme', () => {
    const task = { taskId: 'done-1', title: 'Finished', status: 'done', createdByUser: { userId: 1, userName: 'Coca', userLastName: '' } } as Task;
    render(<ThemeProvider theme={createTheme({ palette: { mode: 'light' } })}><TaskHeader task={task} showActions={false} onMenuOpen={() => undefined} /></ThemeProvider>);
    expect(screen.getByText('Done')).toHaveStyle({ color: '#075b35' });
  });
});

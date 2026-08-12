import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SelectMenu from './SelectMenu';

const options = [
  { value: 1, label: '첫 번째' },
  { value: 2, label: '두 번째' },
  { value: 3, label: '선택 불가', disabled: true },
];

const setViewportWidth = (width: number): void => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
};

beforeEach(() => {
  setViewportWidth(1024);
  document.body.style.overflow = '';
});

afterEach(() => {
  document.body.style.overflow = '';
});

describe('SelectMenu', () => {
  it('opens and selects an enabled desktop option', async () => {
    const onChange = jest.fn((_value: string | number | undefined): void => undefined);

    render(
      <SelectMenu
        value={1}
        options={options}
        onChange={onChange}
        ariaLabel="강화 단계"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '강화 단계' }));
    expect(screen.getByRole('listbox', { name: '강화 단계' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('option', { name: '두 번째' }));

    expect(onChange).toHaveBeenCalledWith(2);
    expect(screen.queryByRole('listbox', { name: '강화 단계' })).not.toBeInTheDocument();
  });


  it('uses the current viewport presentation after resizing while closed', async () => {
    render(
      <SelectMenu
        value={1}
        options={options}
        onChange={jest.fn()}
        ariaLabel="강화 단계"
        panelTitle="목표 강화 단계"
      />,
    );

    setViewportWidth(390);
    fireEvent(window, new Event('resize'));
    await userEvent.click(screen.getByRole('button', { name: '강화 단계' }));

    expect(screen.getByRole('dialog', { name: '목표 강화 단계' })).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    setViewportWidth(1024);
    fireEvent(window, new Event('resize'));
    await userEvent.click(screen.getByRole('button', { name: '강화 단계' }));

    expect(screen.queryByRole('dialog', { name: '목표 강화 단계' })).not.toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: '강화 단계' })).toBeInTheDocument();
  });

  it('closes an open menu with Escape without changing the value', async () => {
    const onChange = jest.fn((_value: string | number | undefined): void => undefined);

    render(
      <SelectMenu
        value={1}
        options={options}
        onChange={onChange}
        ariaLabel="강화 단계"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '강화 단계' }));
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('listbox', { name: '강화 단계' })).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps the menu open when a disabled option is pressed', async () => {
    const onChange = jest.fn((_value: string | number | undefined): void => undefined);

    render(
      <SelectMenu
        value={1}
        options={options}
        onChange={onChange}
        ariaLabel="강화 단계"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '강화 단계' }));
    await userEvent.click(screen.getByRole('option', { name: '선택 불가' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('listbox', { name: '강화 단계' })).toBeInTheDocument();
  });

  it('focuses the selected enabled mobile option and restores body scroll after selection', async () => {
    setViewportWidth(390);
    const onChange = jest.fn((_value: string | number | undefined): void => undefined);

    render(
      <SelectMenu
        value={2}
        options={options}
        onChange={onChange}
        ariaLabel="강화 단계"
        panelTitle="목표 강화 단계"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '강화 단계' }));

    expect(screen.getByRole('dialog', { name: '목표 강화 단계' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '목표 강화 단계 닫기' })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement).toBe(screen.getByRole('option', { name: '두 번째' }));

    await userEvent.click(screen.getByRole('option', { name: '첫 번째' }));

    expect(onChange).toHaveBeenCalledWith(1);
    expect(screen.queryByRole('dialog', { name: '목표 강화 단계' })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '강화 단계' }));
  });

  it('focuses the mobile close action when no option is enabled', async () => {
    setViewportWidth(390);

    render(
      <SelectMenu
        value={3}
        options={[{ value: 3, label: '선택 불가', disabled: true }]}
        onChange={jest.fn()}
        ariaLabel="강화 단계"
        panelTitle="목표 강화 단계"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '강화 단계' }));

    expect(document.activeElement).toBe(screen.getByRole('button', { name: '목표 강화 단계 닫기' }));
  });

  it('traps Tab inside the mobile sheet and isolates the background', async () => {
    setViewportWidth(390);
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    render(
      <SelectMenu
        value={1}
        options={options}
        onChange={jest.fn()}
        ariaLabel="강화 단계"
        panelTitle="목표 강화 단계"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '강화 단계' }));

    const firstOption = screen.getByRole('option', { name: '첫 번째' });
    const closeButton = screen.getByRole('button', { name: '목표 강화 단계 닫기' });
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(document.activeElement).toBe(firstOption);

    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(closeButton);

    await userEvent.tab();
    expect(document.activeElement).toBe(firstOption);

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: '목표 강화 단계' })).not.toBeInTheDocument();
    expect(root).not.toHaveAttribute('aria-hidden');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '강화 단계' }));

    document.body.removeChild(root);
  });

  it('closes the mobile sheet from its explicit close action', async () => {
    setViewportWidth(390);

    render(
      <SelectMenu
        options={options}
        onChange={jest.fn()}
        ariaLabel="강화 단계"
        panelTitle="목표 강화 단계"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '강화 단계' }));
    expect(document.activeElement).toBe(screen.getByRole('option', { name: '첫 번째' }));
    await userEvent.click(screen.getByRole('button', { name: '목표 강화 단계 닫기' }));

    expect(screen.queryByRole('dialog', { name: '목표 강화 단계' })).not.toBeInTheDocument();
  });
});
